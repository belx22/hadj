package cm.afriland.copilotehadj.controller;

import cm.afriland.copilotehadj.service.AuthService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        return auth.login(body.get("username"), body.get("password"));
    }

    @PostMapping("/mot-de-passe-oublie")
    public Map<String, Object> forgot(@RequestBody Map<String, String> body) {
        return auth.requestPasswordReset(body.get("identifier"));
    }

    @PostMapping("/reinitialiser-mot-de-passe")
    public Map<String, Object> reset(@RequestBody Map<String, String> body) {
        return auth.resetPassword(body.get("identifier"), body.get("otp"), body.get("newPassword"));
    }
}
