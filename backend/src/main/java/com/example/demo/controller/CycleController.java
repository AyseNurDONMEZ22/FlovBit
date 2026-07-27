package com.example.demo.controller;

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
import com.example.demo.repository.CycleRepository;

@RestController
@RequestMapping("/api/v1/cycles")
@CrossOrigin(origins = "*") // Tüm bağlantılara izin ver
public class CycleController {

    @Autowired
    private CycleRepository cycleRepository;

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

    // BURASI DEĞİŞTİ: @PatchMapping yerine @PutMapping kullanıyoruz
    @PutMapping("/{id}/status")
    public ResponseEntity<Cycle> updateCycleStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Cycle cycle = cycleRepository.findById(id).orElseThrow(() -> new RuntimeException("Cycle bulunamadı"));
        cycle.setStatus(body.get("status"));
        return ResponseEntity.ok(cycleRepository.save(cycle));
    }
}