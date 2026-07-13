package cm.afriland.copilotehadj.repository;

import cm.afriland.copilotehadj.entity.Encadreur;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EncadreurRepository extends JpaRepository<Encadreur, String> {
    Optional<Encadreur> findByCode(String code);
    boolean existsByCode(String code);
}
