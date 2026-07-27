package com.example.demo.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.entity.Cycle;
import com.example.demo.repository.CycleRepository;

@Service
public class CycleService {

    @Autowired
    private CycleRepository cycleRepository;

    // Yeni Sprint Oluşturma
    public Cycle createCycle(Cycle cycle) {
        if (cycle.getStatus() == null) {
            cycle.setStatus("PLANNING");
        }
        return cycleRepository.save(cycle);
    }

    // Projeye ait tüm sprintleri getirme
    public List<Cycle> getCyclesByProjectId(Long projectId) {
        return cycleRepository.findByProjectId(projectId);
    }
}