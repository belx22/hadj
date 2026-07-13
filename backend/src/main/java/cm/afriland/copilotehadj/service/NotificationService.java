package cm.afriland.copilotehadj.service;

import cm.afriland.copilotehadj.entity.Bordereau;
import cm.afriland.copilotehadj.entity.Notification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

/**
 * Service de notification (mock) — documente le point de branchement vers de
 * vrais fournisseurs SMS/WhatsApp/Email. Enregistre aussi la notification sur
 * le dossier du pèlerin.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    public void notifyPilgrim(Bordereau b, String message) {
        log.info("[SMS] -> {} : {}", b.getPhone(), message);
        log.info("[WhatsApp] -> {} : {}", b.getPhone(), message);
        if (b.getEmail() != null && !b.getEmail().isBlank()) {
            log.info("[Email] -> {} : {}", b.getEmail(), message);
        }
        Notification n = new Notification();
        n.setDate(LocalDate.now().toString());
        n.setMessage(message);
        b.addNotification(n);
    }

    public void sendEmail(String email, String subject, String body) {
        log.info("[Email] -> {} | {} : {}", email, subject, body);
    }
}
