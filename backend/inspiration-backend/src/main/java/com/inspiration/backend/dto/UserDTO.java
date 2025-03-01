package com.inspiration.backend.dto;

import lombok.Data;

@Data
public class UserDTO {
    private Long id;
    private String username;
    private String email;
    private String avatar;
    private String bio;
} 