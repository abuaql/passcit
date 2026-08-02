-- CreateTable
CREATE TABLE `InterviewSimulation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `testVersionId` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `durationSec` INTEGER NULL,
    `identityQuestionsCompleted` BOOLEAN NOT NULL DEFAULT false,
    `readingResult` ENUM('PASSED', 'FAILED', 'NOT_REACHED') NOT NULL DEFAULT 'NOT_REACHED',
    `readingAttempts` JSON NULL,
    `writingResult` ENUM('PASSED', 'FAILED', 'NOT_REACHED') NOT NULL DEFAULT 'NOT_REACHED',
    `writingAttempts` JSON NULL,
    `civicsResult` ENUM('PASSED', 'FAILED', 'NOT_REACHED') NOT NULL DEFAULT 'NOT_REACHED',
    `civicsCorrectCount` INTEGER NOT NULL DEFAULT 0,
    `civicsIncorrectCount` INTEGER NOT NULL DEFAULT 0,
    `passed` BOOLEAN NULL,

    INDEX `InterviewSimulation_userId_idx`(`userId`),
    INDEX `InterviewSimulation_testVersionId_idx`(`testVersionId`),
    INDEX `InterviewSimulation_userId_completedAt_idx`(`userId`, `completedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InterviewCivicsAnswer` (
    `id` VARCHAR(191) NOT NULL,
    `interviewId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `isCorrect` BOOLEAN NOT NULL,
    `answeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `spokenAnswer` TEXT NOT NULL,

    INDEX `InterviewCivicsAnswer_interviewId_idx`(`interviewId`),
    INDEX `InterviewCivicsAnswer_questionId_idx`(`questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InterviewSimulation` ADD CONSTRAINT `InterviewSimulation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewSimulation` ADD CONSTRAINT `InterviewSimulation_testVersionId_fkey` FOREIGN KEY (`testVersionId`) REFERENCES `TestVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewCivicsAnswer` ADD CONSTRAINT `InterviewCivicsAnswer_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `InterviewSimulation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewCivicsAnswer` ADD CONSTRAINT `InterviewCivicsAnswer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
