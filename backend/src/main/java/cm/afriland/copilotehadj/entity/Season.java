package cm.afriland.copilotehadj.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
@Entity
@Table(name = "season")
public class Season {
    @Id
    private Integer season; // année (2027...)

    private Integer month;
    private Integer year;

    @Column(nullable = false)
    @JsonProperty("isOpen")
    private boolean isOpen = true;

    // Prix par type de pèlerin (PELERIN, ENCADREUR, OFFICIEL, GUH).
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "season_price", joinColumns = @JoinColumn(name = "season"))
    @MapKeyColumn(name = "pilgrim_type")
    @Column(name = "price")
    private Map<String, Long> prices = new HashMap<>();

    // Prix officiel hors commission et commission par pèlerin (calcul commissions).
    private Long officialPriceExcludingCommission;
    private Long commissionPerPilgrim;
}
