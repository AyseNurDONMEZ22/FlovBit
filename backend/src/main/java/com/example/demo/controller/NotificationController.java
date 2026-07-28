package com.example.demo.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.entity.Notification;
import com.example.demo.repository.NotificationRepository;

@RestController
@RequestMapping("/api/v1/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    // 1. ZİL İKONUNUN KULLANDIĞI API UCU: Kullanıcının tüm bildirimlerini getirir
    @GetMapping("/user/{email}")
    public ResponseEntity<List<Notification>> getUserNotifications(@PathVariable String email) {
        return ResponseEntity.ok(notificationRepository.findByUserEmail(email));
    }

    // 2. BİLDİRİMİ OKUNDU İŞARETLEME API UCU
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        return notificationRepository.findById(id).map(notif -> {
            notif.setRead(true);
            return ResponseEntity.ok(notificationRepository.save(notif));
        }).orElse(ResponseEntity.notFound().build());
    }

    // 3. TÜMÜNÜ OKUNDU İŞARETLEME (Frontend'deki eksik endpoint tamamlandı)
    @PutMapping("/user/{email}/read-all")
    public ResponseEntity<?> markAllAsRead(@PathVariable String email) {
        List<Notification> unreadNotifs = notificationRepository.findByUserEmail(email).stream()
                .filter(n -> !n.isRead())
                .toList();

        unreadNotifs.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unreadNotifs);
        
        return ResponseEntity.ok().body("{\"message\": \"Tüm bildirimler okundu.\"}");
    }
}