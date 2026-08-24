<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;

const SEVENUP_MAX_POST_BYTES = 24576;
const SEVENUP_RATE_LIMIT_WINDOW = 900;
const SEVENUP_RATE_LIMIT_MAX = 4;

require_once __DIR__ . '/lib/PHPMailer/src/Exception.php';
require_once __DIR__ . '/lib/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/lib/PHPMailer/src/SMTP.php';

function sevenup_local_config(): array
{
    static $config = null;

    if ($config !== null) {
        return $config;
    }

    $path = __DIR__ . '/config.local.php';
    $config = is_file($path) ? require $path : [];

    return is_array($config) ? $config : [];
}

function sevenup_env(string $key, string $default = ''): string
{
    $value = getenv($key);

    if ($value !== false && $value !== '') {
        return (string) $value;
    }

    $local = sevenup_local_config();

    if (isset($local[$key]) && $local[$key] !== '') {
        return (string) $local[$key];
    }

    return $default;
}

function sevenup_wants_json(): bool
{
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $xhr = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';

    return str_contains($accept, 'application/json') || strtolower($xhr) === 'xmlhttprequest';
}

function sevenup_response(int $status, bool $ok, string $message, array $errors = []): void
{
    http_response_code($status);

    if (sevenup_wants_json()) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'ok' => $ok,
            'message' => $message,
            'errors' => $errors,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    $target = $ok ? '/?contact=success#agendamento' : '/?contact=error#agendamento';
    header('Location: ' . $target, true, $ok ? 303 : 302);
    exit;
}

function sevenup_clean_text(string $value, int $maxLength): string
{
    $value = trim($value);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/u', '', $value) ?? '';
    $value = preg_replace("/\r\n|\r/", "\n", $value) ?? '';
    $value = preg_replace('/[ \t]+/', ' ', $value) ?? '';
    $value = trim($value);

    if (sevenup_strlen($value) > $maxLength) {
        $value = sevenup_substr($value, 0, $maxLength);
    }

    return $value;
}

function sevenup_strlen(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function sevenup_substr(string $value, int $start, int $length): string
{
    return function_exists('mb_substr') ? mb_substr($value, $start, $length, 'UTF-8') : substr($value, $start, $length);
}

function sevenup_clean_meta(?string $value, int $maxLength = 180): string
{
    if ($value === null) {
        return '';
    }

    $value = sevenup_clean_text($value, $maxLength);
    return str_replace(["\n", "\r"], ' ', $value);
}

function sevenup_rate_limited(): bool
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $key = hash('sha256', $ip . '|' . $ua);
    $path = sys_get_temp_dir() . '/sevenup-contact-' . $key . '.json';
    $now = time();
    $hits = [];

    if (is_file($path)) {
        $raw = file_get_contents($path);
        $decoded = $raw ? json_decode($raw, true) : null;
        $hits = is_array($decoded) ? $decoded : [];
    }

    $hits = array_values(array_filter($hits, static fn ($hit) => is_int($hit) && ($now - $hit) < SEVENUP_RATE_LIMIT_WINDOW));

    if (count($hits) >= SEVENUP_RATE_LIMIT_MAX) {
        return true;
    }

    $hits[] = $now;
    file_put_contents($path, json_encode($hits), LOCK_EX);

    return false;
}

function sevenup_validate_origin(): bool
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';

    foreach ([$origin, $referer] as $url) {
        if ($url === '') {
            continue;
        }

        $parsedHost = parse_url($url, PHP_URL_HOST);

        if (is_string($parsedHost) && strcasecmp($parsedHost, $host) !== 0) {
            return false;
        }
    }

    return true;
}

function sevenup_validate_payload(array $post): array
{
    $errors = [];
    $name = sevenup_clean_text((string) ($post['nome'] ?? ''), 120);
    $phone = sevenup_clean_meta((string) ($post['telefone'] ?? ''), 40);
    $phoneDigits = preg_replace('/\D+/', '', $phone) ?? '';
    $email = sevenup_clean_meta((string) ($post['email'] ?? ''), 160);
    $message = sevenup_clean_text((string) ($post['mensagem'] ?? ''), 1500);
    $privacy = isset($post['privacidade']);
    $honeypot = trim((string) ($post['website'] ?? '')) . trim((string) ($post['_honey'] ?? ''));
    $loadedAt = (string) ($post['form_loaded_at'] ?? '');

    if ($honeypot !== '') {
        $errors['form'] = 'Não foi possível enviar sua solicitação. Tente novamente.';
    }

    if (sevenup_strlen($name) < 2 || sevenup_strlen($name) > 120) {
        $errors['nome'] = 'Informe seu nome completo.';
    }

    if (strlen($phoneDigits) < 10 || strlen($phoneDigits) > 13) {
        $errors['telefone'] = 'Informe um telefone válido com DDD.';
    }

    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Informe um e-mail válido ou deixe o campo vazio.';
    }

    if (sevenup_strlen($message) < 10 || sevenup_strlen($message) > 1500) {
        $errors['mensagem'] = 'Conte brevemente como podemos ajudar.';
    }

    if (!$privacy) {
        $errors['privacidade'] = 'Aceite a Política de Privacidade para continuar.';
    }

    if ($loadedAt !== '' && ctype_digit($loadedAt)) {
        $elapsed = (int) floor((microtime(true) * 1000) - (int) $loadedAt);

        if ($elapsed < 3000 || $elapsed > 10800000) {
            $errors['form'] = 'Atualize a página e tente enviar novamente.';
        }
    }

    $utm = [];
    foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'landing_url', 'referrer'] as $field) {
        $utm[$field] = sevenup_clean_meta($post[$field] ?? '', $field === 'landing_url' || $field === 'referrer' ? 600 : 180);
    }

    return [
        'errors' => $errors,
        'data' => [
            'name' => $name,
            'phone' => $phone,
            'phone_digits' => $phoneDigits,
            'email' => $email,
            'message' => $message,
            'utm' => $utm,
        ],
    ];
}

function sevenup_email_body(array $data): string
{
    $lines = [
        'Novo contato pelo site SevenUp',
        '',
        'Nome: ' . $data['name'],
        'Telefone / WhatsApp: ' . $data['phone'],
        'E-mail: ' . ($data['email'] !== '' ? $data['email'] : 'não informado'),
        'Mensagem:',
        '',
        $data['message'],
        '',
        'Origem:',
        '',
        'utm_source: ' . ($data['utm']['utm_source'] ?: 'não informado'),
        'utm_medium: ' . ($data['utm']['utm_medium'] ?: 'não informado'),
        'utm_campaign: ' . ($data['utm']['utm_campaign'] ?: 'não informado'),
        'utm_content: ' . ($data['utm']['utm_content'] ?: 'não informado'),
        'utm_term: ' . ($data['utm']['utm_term'] ?: 'não informado'),
        'gclid: ' . ($data['utm']['gclid'] ?: 'não informado'),
        'Página: ' . ($data['utm']['landing_url'] ?: 'não informado'),
        'Referrer: ' . ($data['utm']['referrer'] ?: 'não informado'),
    ];

    return implode("\n", $lines);
}

function sevenup_send_mail(array $data): void
{
    $host = sevenup_env('SMTP_HOST');
    $port = (int) sevenup_env('SMTP_PORT', '587');
    $user = sevenup_env('SMTP_USER');
    $pass = sevenup_env('SMTP_PASS');
    $secure = strtolower(sevenup_env('SMTP_SECURE', 'tls'));
    $from = sevenup_env('SMTP_FROM', $user);
    $fromName = sevenup_env('SMTP_FROM_NAME', 'Clínica SevenUp');
    $to = sevenup_env('SMTP_TO', 'clinicasevenup@gmail.com');

    if ($host === '' || $user === '' || $pass === '' || $from === '') {
        throw new RuntimeException('smtp_not_configured');
    }

    $mail = new PHPMailer(true);
    $mail->CharSet = 'UTF-8';
    $mail->isSMTP();
    $mail->Host = $host;
    $mail->Port = $port > 0 ? $port : 587;
    $mail->SMTPAuth = true;
    $mail->Username = $user;
    $mail->Password = $pass;
    $mail->SMTPSecure = $secure === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
    $mail->SMTPAutoTLS = true;
    $mail->setFrom($from, $fromName);
    $mail->addAddress($to, 'Clínica SevenUp');

    if ($data['email'] !== '') {
        $mail->addReplyTo($data['email'], $data['name']);
    }

    $mail->Subject = 'Novo agendamento pelo site SevenUp';
    $mail->Body = sevenup_email_body($data);
    $mail->AltBody = $mail->Body;
    $mail->send();
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    sevenup_response(405, false, 'Método não permitido.');
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > SEVENUP_MAX_POST_BYTES) {
    sevenup_response(413, false, 'Sua mensagem está muito longa. Reduza o texto e tente novamente.');
}

if (!sevenup_validate_origin()) {
    sevenup_response(400, false, 'Não foi possível validar a origem do envio.');
}

if (sevenup_rate_limited()) {
    sevenup_response(429, false, 'Recebemos muitas tentativas em pouco tempo. Tente novamente mais tarde.');
}

$validation = sevenup_validate_payload($_POST);

if ($validation['errors'] !== []) {
    sevenup_response(422, false, 'Revise os campos destacados e tente novamente.', $validation['errors']);
}

try {
    sevenup_send_mail($validation['data']);
    sevenup_response(200, true, 'Recebemos sua solicitação. Nossa equipe entrará em contato em breve.');
} catch (MailException | RuntimeException $exception) {
    error_log('sevenup_contact_status=mail_error request_id=' . bin2hex(random_bytes(8)));
    sevenup_response(500, false, 'Não foi possível enviar agora. Tente novamente em alguns minutos ou fale pelo WhatsApp.');
} catch (Throwable $exception) {
    error_log('sevenup_contact_status=unexpected_error request_id=' . bin2hex(random_bytes(8)));
    sevenup_response(500, false, 'Não foi possível enviar agora. Tente novamente em alguns minutos ou fale pelo WhatsApp.');
}
