package com.example.demo.controller;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

import com.example.demo.entity.Cycle;
import com.example.demo.entity.Issue;
import com.example.demo.repository.CycleRepository;
import com.example.demo.repository.IssueRepository;

@RestController
@RequestMapping("/api/v1/cycles")
@CrossOrigin(origins = "*") // Tüm bağlantılara izin ver
public class CycleController {

    @Autowired
    private CycleRepository cycleRepository;

    // YENİ: issue sayısını hesaplamak için
    @Autowired
    private IssueRepository issueRepository;

    @GetMapping("/project/{projectId}")
    public List<Cycle> getCyclesByProject(@PathVariable Long projectId) {
        return cycleRepository.findByProjectId(projectId);
    }

    @PostMapping("/create")
    public ResponseEntity<Cycle> createCycle(@RequestBody Cycle cycle) {
        if (cycle.getStatus() == null || cycle.getStatus().isEmpty()) {
            cycle.setStatus("Planning");
        }
        Cycle savedCycle = cycleRepository.save(cycle);
        return ResponseEntity.ok(savedCycle);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Cycle> updateCycleStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Cycle cycle = cycleRepository.findById(id).orElseThrow(() -> new RuntimeException("Cycle bulunamadı"));
        cycle.setStatus(body.get("status"));
        return ResponseEntity.ok(cycleRepository.save(cycle));
    }

    // YENİ: Cycle özeti — issue sayısı + kalan gün (MCP Resources: cycle://{cycleId}/summary)
    @GetMapping("/{id}/summary")
    public ResponseEntity<?> getCycleSummary(@PathVariable Long id) {
        Cycle cycle = cycleRepository.findById(id).orElse(null);
        if (cycle == null) {
            return ResponseEntity.notFound().build();
        }

        List<Issue> issues = issueRepository.findByCycleId(id);
        long done = issues.stream().filter(i -> "Done".equalsIgnoreCase(i.getStatus())).count();

        Long daysRemaining = null;
        if (cycle.getEndDate() != null) {
            daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), cycle.getEndDate());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("id", cycle.getId());
        result.put("name", cycle.getName());
        result.put("goal", cycle.getGoal());
        result.put("status", cycle.getStatus());
        result.put("startDate", cycle.getStartDate());
        result.put("endDate", cycle.getEndDate());
        result.put("issueCount", issues.size());
        result.put("doneCount", done);
        result.put("daysRemaining", daysRemaining);

        return ResponseEntity.ok(result);
    }
}