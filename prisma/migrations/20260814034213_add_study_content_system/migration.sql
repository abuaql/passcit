-- AlterTable
-- Scoped to the Study Content feature only. The auto-generated diff also
-- proposed `ALTER COLUMN updatedAt DROP DEFAULT` on Announcement, Question,
-- SiteSettings, StudyStreak, TestVersion, User, and UserQuestionProgress —
-- pre-existing drift between schema.prisma and the dev DB, unrelated to
-- this feature and unrelated to any change made for it. Deliberately left
-- out of this migration; only User's new column is included below.
ALTER TABLE `User` ADD COLUMN `studyLanguage` ENUM('EN', 'AR', 'ES', 'HI', 'UR', 'FR', 'PT', 'ZH', 'RU', 'KO', 'VI', 'TL') NOT NULL DEFAULT 'EN';

-- CreateTable
CREATE TABLE `QuestionStudyContent` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `language` ENUM('EN', 'AR', 'ES', 'HI', 'UR', 'FR', 'PT', 'ZH', 'RU', 'KO', 'VI', 'TL') NOT NULL,
    `explanation` TEXT NULL,
    `translatedQuestion` TEXT NULL,
    `translatedAnswer` TEXT NULL,
    `memoryTip` TEXT NULL,
    `explanationStatus` ENUM('PENDING', 'GENERATING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `explanationAiVersion` VARCHAR(191) NULL,
    `explanationGeneratedAt` DATETIME(3) NULL,
    `explanationDurationMs` INTEGER NULL,
    `translationStatus` ENUM('PENDING', 'GENERATING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `translationAiVersion` VARCHAR(191) NULL,
    `translationGeneratedAt` DATETIME(3) NULL,
    `translationDurationMs` INTEGER NULL,
    `memoryTipStatus` ENUM('PENDING', 'GENERATING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `memoryTipAiVersion` VARCHAR(191) NULL,
    `memoryTipGeneratedAt` DATETIME(3) NULL,
    `memoryTipDurationMs` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `QuestionStudyContent_questionId_language_key`(`questionId`, `language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudyActionEvent` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `action` ENUM('EXPLANATION', 'TRANSLATION', 'MEMORY_TIP', 'LISTEN') NOT NULL,
    `language` ENUM('EN', 'AR', 'ES', 'HI', 'UR', 'FR', 'PT', 'ZH', 'RU', 'KO', 'VI', 'TL') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StudyActionEvent_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `StudyActionEvent_questionId_action_idx`(`questionId`, `action`),
    INDEX `StudyActionEvent_action_createdAt_idx`(`action`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AIGenerationLog` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NULL,
    `language` ENUM('EN', 'AR', 'ES', 'HI', 'UR', 'FR', 'PT', 'ZH', 'RU', 'KO', 'VI', 'TL') NOT NULL,
    `contentType` ENUM('EXPLANATION', 'TRANSLATION', 'MEMORY_TIP') NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `promptTokens` INTEGER NOT NULL,
    `completionTokens` INTEGER NOT NULL,
    `totalTokens` INTEGER NOT NULL,
    `estimatedCostUsd` DOUBLE NULL,
    `durationMs` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AIGenerationLog_createdAt_idx`(`createdAt`),
    INDEX `AIGenerationLog_contentType_idx`(`contentType`),
    INDEX `AIGenerationLog_language_idx`(`language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `QuestionStudyContent` ADD CONSTRAINT `QuestionStudyContent_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyActionEvent` ADD CONSTRAINT `StudyActionEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyActionEvent` ADD CONSTRAINT `StudyActionEvent_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
