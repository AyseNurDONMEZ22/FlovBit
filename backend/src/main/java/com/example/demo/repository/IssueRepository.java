package com.example.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.Issue;

public interface IssueRepository extends JpaRepository<Issue, Long> {
    List<Issue> findByProjectId(Long projectId);
    List<Issue> findByAssigneeEmail(String email);
    List<Issue> findByProjectIdIn(List<Long> projectIds);
    List<Issue> findByCycleId(Long cycleId);
}