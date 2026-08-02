-- AlterTable
ALTER TABLE `EligibilityCalculation`
    MODIFY COLUMN `basis` ENUM('GENERAL', 'MARRIED_TO_CITIZEN', 'MILITARY') NOT NULL DEFAULT 'GENERAL',
    ADD COLUMN `militaryCountryServed` VARCHAR(191) NULL,
    ADD COLUMN `militaryServiceType` ENUM('MANDATORY', 'VOLUNTARY') NULL,
    ADD COLUMN `militaryServiceStart` DATETIME(3) NULL,
    ADD COLUMN `militaryServiceEnd` DATETIME(3) NULL,
    ADD COLUMN `militaryCurrentlyServing` BOOLEAN NULL,
    ADD COLUMN `militaryUSArmedForces` BOOLEAN NULL;
