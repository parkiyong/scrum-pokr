package com.scrumpokr.server;

import com.scrumpokr.server.controller.RoomRestController;
import com.scrumpokr.server.service.RoomRegistryService;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;

@SpringBootApplication
@Import({RoomRegistryService.class, RoomRestController.class})
public class ServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(ServerApplication.class, args);
    }
}
