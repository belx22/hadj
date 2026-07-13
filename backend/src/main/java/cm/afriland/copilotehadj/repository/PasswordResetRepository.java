package cm.afriland.copilotehadj.repository;

import cm.afriland.copilotehadj.entity.PasswordReset;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetRepository extends JpaRepository<PasswordReset, String> {
}
