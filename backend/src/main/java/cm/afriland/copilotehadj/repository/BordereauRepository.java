package cm.afriland.copilotehadj.repository;

import cm.afriland.copilotehadj.entity.Bordereau;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BordereauRepository extends JpaRepository<Bordereau, String> {
    boolean existsByIdNumberAndSeason(String idNumber, Integer season);
    // Deux pèlerins ne peuvent pas partager le même téléphone sur une saison.
    boolean existsByPhoneAndSeason(String phone, Integer season);
    List<Bordereau> findByEncadreurId(String encadreurId);
    List<Bordereau> findBySeason(Integer season);
    Optional<Bordereau> findByIdNumberAndPhone(String idNumber, String phone);
    List<Bordereau> findByIdNumberAndSeason(String idNumber, Integer season);
    Optional<Bordereau> findFirstByIdNumber(String idNumber);
}
