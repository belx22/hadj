package cm.afriland.copilotehadj.repository;

import cm.afriland.copilotehadj.entity.Season;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SeasonRepository extends JpaRepository<Season, Integer> {

    /**
     * Saisons ouvertes, de la plus récente à la plus ancienne. On utilise une
     * requête JPQL explicite (et non une requête dérivée) car le champ booléen
     * s'appelle {@code isOpen} : le nom d'attribut Hibernate est {@code isOpen},
     * ce qui rend le dérivé « ...ByOpen... » ambigu.
     */
    @Query("SELECT s FROM Season s WHERE s.isOpen = true ORDER BY s.season DESC")
    List<Season> findOpenSeasonsMostRecentFirst(Pageable pageable);

    /** Saisons de la plus récente à la plus ancienne (ouvertes ou non). */
    @Query("SELECT s FROM Season s ORDER BY s.season DESC")
    List<Season> findAllMostRecentFirst(Pageable pageable);
}
