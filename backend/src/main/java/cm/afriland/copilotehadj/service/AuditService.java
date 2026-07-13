package cm.afriland.copilotehadj.service;

import cm.afriland.copilotehadj.entity.AuditLog;
import cm.afriland.copilotehadj.repository.AuditLogRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class AuditService {

    private final AuditLogRepository repo;

    public AuditService(AuditLogRepository repo) {
        this.repo = repo;
    }

    public void log(String action, String target, String user) {
        AuditLog a = new AuditLog();
        a.setAction(action);
        a.setTarget(target);
        a.setUser(user != null ? user : currentUser());
        a.setTimestamp(Instant.now());
        repo.save(a);
    }

    public String currentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getName() != null ? auth.getName() : "system";
    }
}
