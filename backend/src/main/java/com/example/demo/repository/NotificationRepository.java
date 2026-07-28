package com.example.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    // User entity'sinin içindeki email'e göre bildirimleri getirir
    List<Notification> findByUserEmail(String email);
}