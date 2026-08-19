package com.example.demo.controller;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.entity.ApiKey;
import com.example.demo.repository.ApiKeyRepository;

@RestController
@RequestMapping("/api/v1/api-keys")
@CrossOrigin(origins = "*")
public class ApiKeyController {

    @Autowired
    private ApiKeyRepository apiKeyRepository;

    private String currentUserEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    // name: "Claude Desktop" gibi bir etiket. expiresInDays: 30 / 90 / 365 / null (never)
    @PostMapping("/create")
    public ResponseEntity<?> createKey(@RequestBody Map<String, Object> request) {
        String name = request.get("name") != null ? (String) request.get("name") : "Unnamed key";
        Integer expiresInDays = request.get("expiresInDays") == null ? null : ((Number) request.get("expiresInDays")).intValue();

        byte[] randomBytes = new byte[32];
        new SecureRandom().nextBytes(randomBytes);
        String rawKey = "fb_" + Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        ApiKey apiKey = new ApiKey();
        apiKey.setUserEmail(currentUserEmail());
        apiKey.setName(name);
        apiKey.setKeyHash(sha256Hex(rawKey));
        apiKey.setKeyPrefix(rawKey.substring(0, 10));
        apiKey.setCreatedAt(LocalDateTime.now());
        apiKey.setExpiresAt(expiresInDays == null ? null : LocalDateTime.now().plusDays(expiresInDays));
        apiKey.setRevoked(false);

        ApiKey saved = apiKeyRepository.save(apiKey);

        // "key" alanı SADECE bu response'ta var — bir daha asla geri getirilemez, sadece hash'i saklanıyor
        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId());
        response.put("name", saved.getName());
        response.put("key", rawKey);
        response.put("prefix", saved.getKeyPrefix());
        response.put("expiresAt", saved.getExpiresAt());
        response.put("createdAt", saved.getCreatedAt());

        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<?> listKeys() {
        List<Map<String, Object>> result = apiKeyRepository.findByUserEmail(currentUserEmail()).stream()
                .map(k -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", k.getId());
                    m.put("name", k.getName());
                    m.put("prefix", k.getKeyPrefix());
                    m.put("createdAt", k.getCreatedAt());
                    m.put("expiresAt", k.getExpiresAt());
                    m.put("revoked", k.isRevoked());
                    m.put("lastUsedAt", k.getLastUsedAt());
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> revokeKey(@PathVariable Long id) {
        ApiKey key = apiKeyRepository.findById(id).orElse(null);
        if (key == null) {
            return ResponseEntity.notFound().build();
        }
        if (!key.getUserEmail().equals(currentUserEmail())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bu API key'e erişim yetkiniz yok.");
        }
        apiKeyRepository.delete(key);
        return ResponseEntity.ok().body("{\"message\": \"API key silindi.\"}");
    }
}