package com.example.demo.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.entity.Issue;
import com.example.demo.repository.IssueRepository;

@RestController
@RequestMapping("/api/v1/issues")
@CrossOrigin(origins = "*")
public class IssueController {

    @Autowired
    private IssueRepository issueRepository;

    // YENİ GÖREV OLUŞTURMA
    @PostMapping("/create")
    public ResponseEntity<?> createIssue(@RequestBody Issue issue) {
        try {
            if (issue.getStatus() == null) issue.setStatus("To Do");
            if (issue.getPriority() == null) issue.setPriority("Medium");
            
            Issue savedIssue = issueRepository.save(issue);
            return ResponseEntity.ok(savedIssue);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Görev kaydedilemedi: " + e.getMessage());
        }
    }

    // BİR PROJEYE AİT TÜM GÖREVLERİ GETİRME
    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<Issue>> getIssuesByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(issueRepository.findByProjectId(projectId));
    }

    // GÖREV DURUMUNU GÜNCELLEME (Sürükle-Bırak için gerekli olan eksik metot eklendi)
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateIssueStatus(@PathVariable Long id, @RequestBody java.util.Map<String, String> body) {
        return issueRepository.findById(id).map(issue -> {
            issue.setStatus(body.get("status"));
            Issue updatedIssue = issueRepository.save(issue);
            return ResponseEntity.ok(updatedIssue);
        }).orElse(ResponseEntity.notFound().build());
    }
}