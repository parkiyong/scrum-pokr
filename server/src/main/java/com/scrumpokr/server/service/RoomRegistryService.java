package com.scrumpokr.server.service;

import com.scrumpokr.server.util.SlugGenerator;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomRegistryService {

    private final Map<String, RoomHandle> rooms = new ConcurrentHashMap<>();

    public RoomHandle createRoom() {
        String slug = SlugGenerator.generateSlug();
        while (rooms.containsKey(slug.toUpperCase())) {
            slug = SlugGenerator.generateSlug();
        }
        String shortCode = SlugGenerator.generateShortCode(slug);
        RoomHandle handle = new RoomHandle(slug.toUpperCase(), shortCode.toUpperCase());
        rooms.put(slug.toUpperCase(), handle);
        return handle;
    }

    public RoomHandle getOrCreate(String slugOrCode) {
        String key = slugOrCode.trim().toUpperCase();
        return rooms.computeIfAbsent(key, k -> new RoomHandle(k, k));
    }

    public RoomHandle find(String slugOrCode) {
        if (slugOrCode == null) return null;
        return rooms.get(slugOrCode.trim().toUpperCase());
    }
}
