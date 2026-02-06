/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.11-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: signage_db
-- ------------------------------------------------------
-- Server version	10.11.11-MariaDB-ubu2404

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `content_schedule`
--

DROP TABLE IF EXISTS `content_schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `content_schedule` (
  `id` varchar(36) NOT NULL,
  `deviceId` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `scheduleType` varchar(50) NOT NULL,
  `specificDate` varchar(30) DEFAULT NULL,
  `daysOfWeek` varchar(30) DEFAULT NULL,
  `startDate` varchar(30) DEFAULT NULL,
  `endDate` varchar(30) DEFAULT NULL,
  `priority` int(11) DEFAULT 0,
  `active` tinyint(1) DEFAULT 1,
  `createdAt` varchar(30) NOT NULL,
  `updatedAt` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_content_schedule_deviceId` (`deviceId`),
  CONSTRAINT `content_schedule_ibfk_1` FOREIGN KEY (`deviceId`) REFERENCES `device` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `content_schedule`
--

LOCK TABLES `content_schedule` WRITE;
/*!40000 ALTER TABLE `content_schedule` DISABLE KEYS */;
INSERT INTO `content_schedule` VALUES
('16e056d1-ceca-422d-a29d-7a15b57d1ec4','b33b809a-aa14-4bca-b9a0-1c3016f17ed7','테스트 스케줄','weekdays',NULL,NULL,NULL,NULL,0,1,'2026-01-07T13:10:59.129Z','2026-01-07T13:10:59.129Z');
/*!40000 ALTER TABLE `content_schedule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `device`
--

DROP TABLE IF EXISTS `device`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `device` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL,
  `alias` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'offline',
  `user_id` varchar(36) DEFAULT NULL,
  `pin_code` varchar(10) DEFAULT NULL,
  `lastConnected` varchar(30) DEFAULT NULL,
  `createdAt` varchar(30) NOT NULL,
  `updatedAt` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_device_user_id` (`user_id`),
  CONSTRAINT `device_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device`
--

LOCK TABLES `device` WRITE;
/*!40000 ALTER TABLE `device` DISABLE KEYS */;
INSERT INTO `device` VALUES
('054d6069-6a5a-4c9f-85f6-9c18858d45ff','복합형(텍스트+이미지+동영상)','2층 엘레베이터','multi','offline','cd324a44-bf53-4c91-9cec-d138831ff907','0000',NULL,'2026-02-02T11:51:31.585Z','2026-02-02T11:51:31.585Z'),
('34e17fd9-bdc8-47f6-9eff-ac01396de7ba','스케줄 디바이스','디바이스 8','스케줄-디바이스','offline','9216ad0c-5cdc-49fa-866f-ff4b8674ad65','0000',NULL,'2026-01-17T17:16:46.283Z','2026-01-17T17:16:46.283Z'),
('45b613a1-eb2f-44b5-9ca6-9ea9b69cc7de','텍스트 디바이스','거실1','device-45b613a1','offline','f559522c-2a19-4168-b0a3-e0f7011c0ba1','0000',NULL,'2026-01-28T15:38:11.488Z','2026-01-28T15:38:11.488Z'),
('46132abe-72c6-4dbd-9fdb-1a4ab09d8256','동영상 ','1층 로비','device1-video','offline','f559522c-2a19-4168-b0a3-e0f7011c0ba1','0000',NULL,'2026-02-02T11:42:05.989Z','2026-02-02T11:42:05.989Z'),
('55bf08fb-65a2-4d18-9fa2-7cacbfee0f82','이미지 ','거실 디바이스1','device1-img','offline','f559522c-2a19-4168-b0a3-e0f7011c0ba1','0000',NULL,'2026-02-02T11:09:10.859Z','2026-02-02T11:09:10.859Z'),
('7429620b-277b-4e24-ab32-def06310bbc9','복합형 디바이스(텍스트+이미지+동영상)','디바이스5','복합형-디바이스(텍스트+이미지+동영상)','offline','9216ad0c-5cdc-49fa-866f-ff4b8674ad65','0000','2026-01-14T11:42:53.093Z','2025-10-24T01:27:25.348Z','2026-01-16T16:24:07.067Z'),
('7ec83f98-127f-4691-88b9-939df0dcf273','이미지+ 분할레이아웃(환자 대기 명단)','디바이스 6','이미지+-분할레이아웃(환자-대기-명단)','offline','9216ad0c-5cdc-49fa-866f-ff4b8674ad65','0000',NULL,'2026-01-16T17:16:34.213Z','2026-01-16T17:16:34.213Z'),
('86836b38-f282-4213-93ff-5150cfcbb48b','이미지 디바이스','디바이스2','이미지-디바이스','offline','9216ad0c-5cdc-49fa-866f-ff4b8674ad65','0000','2026-01-14T11:42:30.862Z','2025-08-07T03:02:34.086Z','2026-01-14T11:42:31.000Z'),
('b33b809a-aa14-4bca-b9a0-1c3016f17ed7','텍스트 디바이스','디바이스1','텍스트-디바이스','offline','9216ad0c-5cdc-49fa-866f-ff4b8674ad65','0000','2026-01-14T11:42:25.240Z','2025-08-07T03:01:56.929Z','2026-01-27T10:48:59.513Z'),
('d1f66a79-dc34-42b7-9f03-b5ecc7799684','동영상 디바이스','디바이스3','동영상-디바이스','offline','9216ad0c-5cdc-49fa-866f-ff4b8674ad65','0000','2026-01-14T11:42:39.597Z','2025-08-07T03:03:30.581Z','2026-01-14T11:42:39.652Z'),
('f626acef-5c3d-47e8-80b1-dd8e8bb353a6','텍스트 + 분할레이아웃(환자 대기 명단)','디바이스4','텍스트-+-분할레이아웃(환자-대기-명단)','offline','9216ad0c-5cdc-49fa-866f-ff4b8674ad65','0000',NULL,'2026-01-16T16:31:12.593Z','2026-01-16T16:31:12.593Z'),
('fd38e3d7-4223-4a17-bcf7-7c0aed2291a2','동영상 + 분할레이아웃(환자 대기 명단)','디바이스7','동영상-+-분할레이아웃(환자-대기-명단)','offline','9216ad0c-5cdc-49fa-866f-ff4b8674ad65','0000',NULL,'2026-01-17T16:51:53.081Z','2026-01-17T16:51:53.081Z');
/*!40000 ALTER TABLE `device` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `device_notices`
--

DROP TABLE IF EXISTS `device_notices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_notices` (
  `id` varchar(36) NOT NULL,
  `device_id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `favorite` tinyint(1) DEFAULT 0,
  `lastUsedAt` varchar(30) DEFAULT NULL,
  `usageCount` int(11) DEFAULT 0,
  `createdAt` varchar(30) NOT NULL,
  `updatedAt` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_device_notices_device_id` (`device_id`),
  KEY `idx_device_notices_category` (`category`),
  CONSTRAINT `device_notices_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `device` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device_notices`
--

LOCK TABLES `device_notices` WRITE;
/*!40000 ALTER TABLE `device_notices` DISABLE KEYS */;
/*!40000 ALTER TABLE `device_notices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `device_patients`
--

DROP TABLE IF EXISTS `device_patients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_patients` (
  `id` varchar(36) NOT NULL,
  `device_id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `number` int(11) NOT NULL,
  `department` varchar(100) NOT NULL,
  `created_at` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_device_patients_device_id` (`device_id`),
  KEY `idx_device_patients_number` (`number`),
  CONSTRAINT `device_patients_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `device` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device_patients`
--

LOCK TABLES `device_patients` WRITE;
/*!40000 ALTER TABLE `device_patients` DISABLE KEYS */;
/*!40000 ALTER TABLE `device_patients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `device_requests`
--

DROP TABLE IF EXISTS `device_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_requests` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `requested_count` int(11) NOT NULL,
  `current_max` int(11) NOT NULL,
  `reason` text DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `approved_count` int(11) DEFAULT NULL,
  `approved_by` varchar(36) DEFAULT NULL,
  `approved_at` varchar(30) DEFAULT NULL,
  `created_at` varchar(30) NOT NULL,
  `updated_at` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_device_requests_user_id` (`user_id`),
  KEY `idx_device_requests_status` (`status`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `device_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `device_requests_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device_requests`
--

LOCK TABLES `device_requests` WRITE;
/*!40000 ALTER TABLE `device_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `device_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `devicecontent`
--

DROP TABLE IF EXISTS `devicecontent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `devicecontent` (
  `id` varchar(36) NOT NULL,
  `deviceId` varchar(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `url` text DEFAULT NULL,
  `text` mediumtext DEFAULT NULL,
  `duration` int(11) NOT NULL,
  `fontSize` varchar(20) DEFAULT NULL,
  `fontColor` varchar(20) DEFAULT NULL,
  `backgroundColor` varchar(20) DEFAULT NULL,
  `alt` varchar(255) DEFAULT NULL,
  `autoplay` tinyint(1) DEFAULT 0,
  `loop` tinyint(1) DEFAULT 0,
  `muted` tinyint(1) DEFAULT 1,
  `metadata` mediumtext DEFAULT NULL,
  `order` int(11) NOT NULL,
  `active` tinyint(1) DEFAULT 1,
  `scheduleType` varchar(20) DEFAULT 'always',
  `specificDate` varchar(30) DEFAULT NULL,
  `daysOfWeek` varchar(30) DEFAULT NULL,
  `startDate` varchar(30) DEFAULT NULL,
  `endDate` varchar(30) DEFAULT NULL,
  `startTime` varchar(10) DEFAULT NULL,
  `endTime` varchar(10) DEFAULT NULL,
  `createdAt` varchar(30) NOT NULL,
  `updatedAt` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_devicecontent_deviceId` (`deviceId`),
  CONSTRAINT `devicecontent_ibfk_1` FOREIGN KEY (`deviceId`) REFERENCES `device` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `devicecontent`
--

LOCK TABLES `devicecontent` WRITE;
/*!40000 ALTER TABLE `devicecontent` DISABLE KEYS */;
INSERT INTO `devicecontent` VALUES
('00457fb6-d0fc-4dc0-a4f4-ed91a547e90f','fd38e3d7-4223-4a17-bcf7-7c0aed2291a2','split_layout',NULL,'[{\"id\":\"1768668765163\",\"type\":\"video\",\"order\":0,\"duration\":5000,\"url\":\"/uploads/1768668769146-2025-11-27 19-38-52.mp4\",\"fontSize\":\"2rem\",\"fontColor\":\"#ffffff\",\"backgroundColor\":\"#000000\"},{\"id\":\"1768669019223\",\"type\":\"youtube\",\"order\":1,\"duration\":5000,\"url\":\"youtube:https://www.youtube.com/watch?v=WXJgoBxMKVU&list=RDWXJgoBxMKVU&start_radio=1\",\"fontSize\":\"2rem\",\"fontColor\":\"#ffffff\",\"backgroundColor\":\"#000000\"}]',10000,NULL,NULL,NULL,NULL,0,0,1,'{\"showNotices\":false}',0,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-17T16:52:49.667Z','2026-01-17T16:57:04.613Z'),
('1d48e88a-1d3f-4902-b1c6-b50cdfabd7a5','7ec83f98-127f-4691-88b9-939df0dcf273','split_layout',NULL,'[{\"id\":\"1768667443891\",\"type\":\"image\",\"order\":0,\"duration\":5000,\"url\":\"/uploads/1768667449201-coco_ent_logo.jpg\",\"fontSize\":\"2rem\",\"fontColor\":\"#ffffff\",\"backgroundColor\":\"#000000\"},{\"id\":\"1768668601570\",\"type\":\"image\",\"order\":1,\"duration\":5000,\"url\":\"/uploads/1768668648520-귀멸1.jpg\",\"fontSize\":\"2rem\",\"fontColor\":\"#ffffff\",\"backgroundColor\":\"#000000\"}]',10000,NULL,NULL,NULL,NULL,0,0,1,'{\"showNotices\":false}',0,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-17T16:30:49.969Z','2026-01-17T16:50:48.904Z'),
('2a174e00-97f7-4c24-b386-8c51659b18ee','7429620b-277b-4e24-ab32-def06310bbc9','mixed',NULL,NULL,5000,NULL,NULL,NULL,NULL,0,0,1,'[{\"type\":\"text\",\"order\":0,\"duration\":5000,\"text\":\"텍스트 추가 테스트\",\"fontSize\":\"200\",\"fontColor\":\"#000000\",\"backgroundColor\":\"#FFFFFF\"}]',3,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-23T11:56:40.454Z','2026-01-23T11:56:40.454Z'),
('2d1ad2ea-48b0-48a6-bcd3-0ee1bac0fb8b','054d6069-6a5a-4c9f-85f6-9c18858d45ff','image','/uploads/1770033184187-귀멸1.jpg',NULL,5000,NULL,NULL,NULL,'귀멸1.jpg',0,0,0,NULL,1,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2026-02-02T11:53:04.190Z','2026-02-02T11:53:04.190Z'),
('326a67d3-98d9-423a-9d59-9961bf2a12cf','34e17fd9-bdc8-47f6-9eff-ac01396de7ba','text',NULL,'항상',5000,'2rem','#ffffff','#000000',NULL,0,0,1,NULL,0,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-20T10:15:09.477Z','2026-01-20T10:15:09.477Z'),
('461dd66d-1a31-4e70-8432-1ccd15a36286','86836b38-f282-4213-93ff-5150cfcbb48b','image','/uploads/1763985082822-cothink_logo_white.png',NULL,5000,NULL,NULL,NULL,'cothink_logo_white.png',0,0,0,NULL,0,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-24T11:51:22.827Z','2025-11-24T11:51:22.827Z'),
('4b0eb74c-ba15-420e-b5ce-e298e8ff6806','b33b809a-aa14-4bca-b9a0-1c3016f17ed7','text',NULL,'코코 이비인후과',5000,'5rem','#fefbfb','#7dcadb',NULL,0,0,1,NULL,1,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-24T11:41:34.292Z','2025-11-24T11:41:34.292Z'),
('55b9b800-c1f4-4a3a-acd5-fc74aa40ac4a','054d6069-6a5a-4c9f-85f6-9c18858d45ff','video','/uploads/1770033204256-2025-11-27 19-38-52.mp4',NULL,5000,NULL,NULL,NULL,'2025-11-27 19-38-52.mp4',1,1,1,NULL,2,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2026-02-02T11:53:24.258Z','2026-02-03T11:28:33.133Z'),
('5975b768-6cf8-4d8e-b007-147a0789859a','46132abe-72c6-4dbd-9fdb-1a4ab09d8256','video','/uploads/1770032593828-2025-11-27 19-38-52.mp4',NULL,0,NULL,NULL,NULL,'2025-11-27 19-38-52.mp4',1,1,1,NULL,0,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2026-02-02T11:43:13.832Z','2026-02-02T11:43:13.832Z'),
('6273fa4d-b579-469b-bff7-48f272f3d84d','45b613a1-eb2f-44b5-9ca6-9ea9b69cc7de','text',NULL,'거실1에 있는 디바이스\n\n\n\n',5000,'100','#000000','#FFFFFF',NULL,0,0,1,NULL,0,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-28T15:39:07.438Z','2026-01-29T11:13:12.153Z'),
('79a8f925-2c6d-4ad5-a8a4-29b56b4e3bae','d1f66a79-dc34-42b7-9f03-b5ecc7799684','video','/uploads/1769168659638-2025-11-27 19-38-52.mp4',NULL,0,NULL,NULL,NULL,'2025-11-27 19-38-52.mp4',1,1,1,NULL,0,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-23T11:44:19.643Z','2026-01-23T11:44:19.643Z'),
('7a892265-0b24-4837-a231-5233d44f74cf','55bf08fb-65a2-4d18-9fa2-7cacbfee0f82','image','/uploads/1770030631457-슬램덩크.jpg',NULL,5000,NULL,NULL,NULL,'슬램덩크.jpg',0,0,0,NULL,1,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2026-02-02T11:10:31.459Z','2026-02-02T11:10:31.459Z'),
('7f13156c-9724-4313-b8ee-95e72ebe6c6f','45b613a1-eb2f-44b5-9ca6-9ea9b69cc7de','text',NULL,' Cothink\n\n\n',5000,'24','#ffffff','#000000',NULL,0,0,1,NULL,1,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-29T11:26:38.913Z','2026-01-29T11:28:52.683Z'),
('854bf858-5cb6-47dc-b0da-e685252af47f','7429620b-277b-4e24-ab32-def06310bbc9','mixed',NULL,NULL,5000,NULL,NULL,NULL,NULL,0,0,1,'[{\"type\":\"video\",\"order\":0,\"duration\":5000,\"url\":\"/uploads/1765535704396-20250603_135137.mp4\"}]',2,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2025-12-12T10:35:04.441Z','2025-12-12T10:35:04.441Z'),
('89c1424e-54eb-4af1-8415-118f4c279559','55bf08fb-65a2-4d18-9fa2-7cacbfee0f82','image','/uploads/1770030580919-coco_ent_logo.jpg',NULL,5000,NULL,NULL,NULL,'coco_ent_logo.jpg',0,0,0,NULL,0,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2026-02-02T11:09:40.924Z','2026-02-02T11:09:40.924Z'),
('8f29207d-f49e-4573-a143-ffe717ae64da','86836b38-f282-4213-93ff-5150cfcbb48b','image','/uploads/1763985443634-coco_ent_logo.jpg',NULL,5000,NULL,NULL,NULL,'coco_ent_logo.jpg',0,0,0,NULL,1,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-24T11:57:23.639Z','2025-11-24T11:57:23.639Z'),
('a4130aab-c19a-4051-b322-cbad604cdf4e','b33b809a-aa14-4bca-b9a0-1c3016f17ed7','text',NULL,'CoThink',5000,'100','#0a0000','#ffffff',NULL,0,0,1,NULL,1,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2025-08-22T01:25:05.692Z','2026-01-23T11:01:40.917Z'),
('a61a695e-4691-42db-afd7-0b8979edead0','054d6069-6a5a-4c9f-85f6-9c18858d45ff','text',NULL,'복합형 화면입니다.\n텍스트 + 이미지 + 동영상이 재생됩니다.\n',5000,'24','#000000','#FFFFFF',NULL,0,0,1,NULL,0,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2026-02-02T11:52:48.483Z','2026-02-02T11:52:48.483Z'),
('bb74b6c0-1e5f-479d-aec9-4d5606eab0e2','7429620b-277b-4e24-ab32-def06310bbc9','mixed',NULL,NULL,7000,NULL,NULL,NULL,NULL,0,0,1,'[{\"type\":\"text\",\"order\":0,\"duration\":5000,\"fontSize\":\"2rem\",\"fontColor\":\"#ffffff\",\"backgroundColor\":\"#000000\",\"text\":\"텍스트 추추추가 테스트\"},{\"type\":\"image\",\"order\":1,\"duration\":2000,\"url\":\"/uploads/1765369487122-슬램덩크.jpg\"}]',1,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2025-12-10T12:24:47.123Z','2026-01-09T10:20:22.304Z'),
('bd13c624-612a-4419-8f9d-474704cd929b','f626acef-5c3d-47e8-80b1-dd8e8bb353a6','split_layout',NULL,'[{\"id\":\"1768583655930\",\"type\":\"text\",\"order\":0,\"duration\":3000,\"text\":\"텍스트 수정\",\"fontSize\":\"2rem\",\"fontColor\":\"#ffffff\",\"backgroundColor\":\"#000000\"},{\"id\":\"1768583675772\",\"type\":\"text\",\"order\":1,\"duration\":5000,\"text\":\"Cothink\",\"fontSize\":\"2rem\",\"fontColor\":\"#ffffff\",\"backgroundColor\":\"#000000\"},{\"id\":\"1768668439201\",\"type\":\"text\",\"order\":2,\"duration\":5000,\"text\":\"텍스트 추가\",\"fontSize\":\"2rem\",\"fontColor\":\"#ffffff\",\"backgroundColor\":\"#000000\"}]',13000,NULL,NULL,NULL,NULL,0,0,1,'{\"showNotices\":false}',0,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-16T17:14:38.262Z','2026-01-17T16:48:34.720Z'),
('ce7d8a3a-b2ca-4ef6-bd0e-f7af5f4e53ad','b33b809a-aa14-4bca-b9a0-1c3016f17ed7','text',NULL,'추가 텍스트 / 디바이스에 적용 버튼 테스트',5000,'200','#ffffff','#000000',NULL,0,0,1,NULL,2,1,'always',NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-23T11:03:44.214Z','2026-01-23T11:30:09.243Z'),
('f01ca175-b0e8-4763-9b5d-7124db819f85','34e17fd9-bdc8-47f6-9eff-ac01396de7ba','text',NULL,'시간제한',5000,'2rem','#ffffff','#000000',NULL,0,0,1,NULL,1,1,'specific_date','2026-01-20',NULL,NULL,NULL,'19:35','19:36','2026-01-20T10:35:29.120Z','2026-01-20T10:35:29.120Z');
/*!40000 ALTER TABLE `devicecontent` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notice`
--

DROP TABLE IF EXISTS `notice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notice` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `favorite` tinyint(1) DEFAULT 0,
  `lastUsedAt` varchar(30) DEFAULT NULL,
  `usageCount` int(11) DEFAULT 0,
  `createdAt` varchar(30) NOT NULL,
  `updatedAt` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notice_category` (`category`),
  KEY `idx_notice_favorite` (`favorite`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notice`
--

LOCK TABLES `notice` WRITE;
/*!40000 ALTER TABLE `notice` DISABLE KEYS */;
INSERT INTO `notice` VALUES
('b9b1ec23-2eb6-4b07-85dc-1ff780a3f80a','설 연휴는 휴진입니다.','설 연휴는 휴진입니다.','휴진안내',0,NULL,0,'2026-01-13T11:35:07.856Z','2026-01-13T11:35:07.856Z'),
('d33c1ed5-e37b-4d5f-a290-babd5794a245','설 연휴 당일만 휴진 입니다.','설 연휴 당일만 휴진 입니다.','휴진안내',0,'2026-01-13T11:39:13.969Z',1,'2026-01-13T11:35:40.155Z','2026-01-13T11:36:08.441Z');
/*!40000 ALTER TABLE `notice` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `token` varchar(500) NOT NULL,
  `expires_at` varchar(30) NOT NULL,
  `created_at` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sessions_token` (`token`(255)),
  KEY `idx_sessions_user_id` (`user_id`),
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `time_slot`
--

DROP TABLE IF EXISTS `time_slot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `time_slot` (
  `id` varchar(36) NOT NULL,
  `scheduleId` varchar(36) NOT NULL,
  `startTime` varchar(10) NOT NULL,
  `endTime` varchar(10) NOT NULL,
  `contentIds` text NOT NULL,
  `createdAt` varchar(30) NOT NULL,
  `updatedAt` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_time_slot_scheduleId` (`scheduleId`),
  CONSTRAINT `time_slot_ibfk_1` FOREIGN KEY (`scheduleId`) REFERENCES `content_schedule` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `time_slot`
--

LOCK TABLES `time_slot` WRITE;
/*!40000 ALTER TABLE `time_slot` DISABLE KEYS */;
INSERT INTO `time_slot` VALUES
('978a4ba4-210b-4235-84a9-6a269aa4158a','16e056d1-ceca-422d-a29d-7a15b57d1ec4','09:00','23:59','[\"4b0eb74c-ba15-420e-b5ce-e298e8ff6806\",\"a4130aab-c19a-4051-b322-cbad604cdf4e\"]','2026-01-07T13:10:59.129Z','2026-01-07T13:10:59.129Z');
/*!40000 ALTER TABLE `time_slot` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'user',
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `name` varchar(100) DEFAULT NULL,
  `max_devices` int(11) DEFAULT 3,
  `created_at` varchar(30) NOT NULL,
  `updated_at` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_username` (`username`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
('9216ad0c-5cdc-49fa-866f-ff4b8674ad65','superadmin',NULL,'$2b$12$9meQOy5uasTah.Dh8bHvw.l/z0DSfeMaEfTpUaEtHx4AuOJWZhi3K','superadmin','approved','슈퍼관리자',999,'2026-01-28T11:20:42.162Z','2026-01-28T11:20:42.162Z'),
('cd324a44-bf53-4c91-9cec-d138831ff907','device2',NULL,'$2b$12$0XJIZGOqBAxsxJMfb89cG.Ef583HrDl/Wu7TQI7047cdFyl9n1hCm','user','approved','사용자2',3,'2026-02-02T11:48:36.279Z','2026-02-02T11:48:56.183Z'),
('f559522c-2a19-4168-b0a3-e0f7011c0ba1','device1',NULL,'$2b$12$12Lee4b85j9jKJXrcJttK.lYjvYnaEdUi/bFag5PbQDbebyLT.m/C','user','approved','device1',3,'2026-01-28T15:35:11.562Z','2026-01-28T15:36:06.856Z');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-06 20:46:43
