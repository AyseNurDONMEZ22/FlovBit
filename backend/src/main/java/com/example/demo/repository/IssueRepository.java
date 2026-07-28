package com.example.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.Issue;

public interface IssueRepository extends JpaRepository<Issue, Long> {
    List<Issue> findByProjectId(Long projectId);
    // Kullanıcının e-posta adresine atanmış görevleri getir
    List<Issue> findByAssigneeEmail(String assigneeEmail);
}