package cm.afriland.copilotehadj.repository;

import cm.afriland.copilotehadj.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, String> {
    Optional<AppUser> findByUsername(String username);
    Optional<AppUser> findByEmailIgnoreCase(String email);
    boolean existsByUsername(String username);
}
