package com.example.demo.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.entity.WorkspaceMember;
import com.example.demo.repository.WorkspaceMemberRepository;

@RestController
@RequestMapping("/api/v1/workspaces/members")
@CrossOrigin(origins = "*")
public class WorkspaceMemberController {

    @Autowired
    private WorkspaceMemberRepository memberRepository;

    // Belirli bir Workspace'in üyelerini listele
    @GetMapping("/{workspaceId}")
    public List<WorkspaceMember> getMembers(@PathVariable Long workspaceId) {
        return memberRepository.findByWorkspaceId(workspaceId);
    }

    // Workspace'e yeni üye ekle
    @PostMapping("/{workspaceId}/add")
    public ResponseEntity<?> addMember(@PathVariable Long workspaceId, @RequestBody WorkspaceMember member) {
        if (memberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, member.getUserEmail())) {
            return ResponseEntity.badRequest().body("Bu kullanıcı zaten çalışma alanına ekli.");
        }
        member.setWorkspaceId(workspaceId);
        if (member.getRole() == null || member.getRole().isEmpty()) {
            member.setRole("MEMBER");
        }
        return ResponseEntity.ok(memberRepository.save(member));
    }
}