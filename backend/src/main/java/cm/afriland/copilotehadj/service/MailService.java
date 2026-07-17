package cm.afriland.copilotehadj.service;

import cm.afriland.copilotehadj.entity.SmtpSettings;
import cm.afriland.copilotehadj.repository.SmtpSettingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import java.util.Properties;

/**
 * Envoi d'emails réels via les paramètres SMTP stockés en base (singleton
 * {@code smtp_settings}). Le {@link org.springframework.mail.javamail.JavaMailSender}
 * est reconstruit à chaque envoi à partir de la configuration courante, de sorte
 * qu'une modification des paramètres est prise en compte immédiatement, sans
 * redémarrage.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private static final int TIMEOUT_MS = 5000;

    private final SmtpSettingsRepository smtp;

    public MailService(SmtpSettingsRepository smtp) {
        this.smtp = smtp;
    }

    /**
     * Vrai lorsque le SMTP est configuré avec des identifiants (hôte + username).
     * On exige le username pour éviter de déclencher la 2FA — et donc une tentative
     * d'envoi qui peut expirer — tant que la boîte d'envoi n'est pas réellement
     * paramétrée. La 2FA s'active automatiquement dès que ces champs sont saisis.
     */
    public boolean isConfigured() {
        SmtpSettings s = smtp.findById(1).orElse(null);
        return s != null && s.getHost() != null && !s.getHost().isBlank()
                && s.getUsername() != null && !s.getUsername().isBlank();
    }

    /**
     * Tente d'envoyer un email. Renvoie true si l'envoi a réussi, false si le SMTP
     * n'est pas configuré ou si l'envoi échoue (jamais d'exception propagée : les
     * appelants s'appuient sur ce booléen pour décider d'un repli).
     */
    public boolean send(String to, String subject, String body) {
        if (to == null || to.isBlank()) return false;
        SmtpSettings s = smtp.findById(1).orElse(null);
        if (s == null || s.getHost() == null || s.getHost().isBlank()) return false;
        try {
            JavaMailSenderImpl sender = new JavaMailSenderImpl();
            sender.setHost(s.getHost());
            sender.setPort(s.getPort() != null ? s.getPort() : 587);
            boolean auth = s.getUsername() != null && !s.getUsername().isBlank();
            if (auth) {
                sender.setUsername(s.getUsername());
                sender.setPassword(s.getPassword());
            }
            Properties props = sender.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", String.valueOf(auth));
            props.put("mail.smtp.starttls.enable", String.valueOf(s.isUseTls()));
            props.put("mail.smtp.connectiontimeout", String.valueOf(TIMEOUT_MS));
            props.put("mail.smtp.timeout", String.valueOf(TIMEOUT_MS));
            props.put("mail.smtp.writetimeout", String.valueOf(TIMEOUT_MS));

            String from = s.getFromEmail() != null && !s.getFromEmail().isBlank()
                    ? s.getFromEmail()
                    : (auth ? s.getUsername() : "no-reply@localhost");

            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(body);
            sender.send(msg);
            log.info("Email envoyé à {}", to);
            return true;
        } catch (Exception e) {
            log.warn("Échec de l'envoi d'email à {} : {}", to, e.getMessage());
            return false;
        }
    }
}
