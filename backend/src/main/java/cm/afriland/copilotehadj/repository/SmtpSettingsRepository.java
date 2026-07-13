package cm.afriland.copilotehadj.repository;

import cm.afriland.copilotehadj.entity.SmtpSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SmtpSettingsRepository extends JpaRepository<SmtpSettings, Integer> {
}
