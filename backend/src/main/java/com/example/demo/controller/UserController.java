package com.example.demo.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;

@RestController
@RequestMapping("/api/v1/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Profil İsmi ve Fotoğrafı Güncelleme
    @PostMapping("/update-profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String newName = request.get("name");
            String avatarUrl = request.get("avatarUrl"); // YENİ: Ön yüzden gelecek profil fotoğrafı URL'si

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı!"));

            // İsim boş gelmediyse güncelle
            if (newName != null && !newName.trim().isEmpty()) {
                user.setUsername(newName);
            }
            
            // Avatar boş gelmediyse güncelle
            if (avatarUrl != null && !avatarUrl.trim().isEmpty()) {
                user.setAvatarUrl(avatarUrl);
            }

            userRepository.save(user);

            return ResponseEntity.ok(Map.of(
                "message", "Profil başarıyla güncellendi.",
                "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : ""
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Profil güncellenemedi: " + e.getMessage());
        }
    }

    // Şifre Değiştirme
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı!"));

        // YENİ: Google ile giren kullanıcının şifresi yoktur, çökmesini (NullPointerException) engelliyoruz
        if ("OAUTH2".equals(user.getProvider()) && user.getPasswordHash() == null) {
            return ResponseEntity.badRequest().body("Google ile giriş yaptığınız için mevcut bir şifreniz yok.");
        }

        // Mevcut şifre kontrolü
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            return ResponseEntity.badRequest().body("Mevcut şifre yanlış!");
        }

        // Yeni şifreyi hashleyerek kaydet
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Şifre başarıyla değiştirildi."));
    }

     @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}