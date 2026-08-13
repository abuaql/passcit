# Passcit 2.0 — Project Instructions

## Product Vision

Passcit is a native iOS citizenship-learning application.

The goal is not to wrap the existing website in a WebView.
The goal is to create a polished, fast, native iOS learning experience.

The app should feel like a real educational product, not a website.

## Existing Backend

The existing Passcit backend is already working.

Do NOT rewrite or replace the backend unless explicitly requested.

The existing backend, database, users, questions, progress logic, and business rules should be reused through APIs where appropriate.

Do not duplicate existing users or data.

## Native Technology

Use:

- Swift
- SwiftUI
- Swift Concurrency
- async/await
- URLSession
- Keychain
- native iOS APIs

Prefer modern Apple APIs.

Avoid unnecessary third-party dependencies.

Do not use WKWebView as the primary application UI.

## Authentication

Supported authentication methods:

1. Sign in with Apple
2. Sign in with Google
3. Email/password

Authentication must NOT be forced immediately on first launch.

The user should be able to enter the application and understand the product before being forced to create an account.

After authentication, persist the session securely using Keychain.

A returning authenticated user should open directly into the learning experience.

The user should not be forced to log in every time the app opens.

Existing email accounts must be safely linkable with Apple and Google authentication where appropriate.

## First Launch Experience

Do NOT immediately show:

"Log in / Sign up"

Instead:

Launch app
→ Welcome / product introduction
→ Learning experience
→ Roadmap
→ Start learning

Authentication should be requested when saving progress or when an authenticated feature requires it.

## Core Learning Experience

The primary experience is a structured learning roadmap.

The user should progress through citizenship topics in sequence.

Example:

Unit 1 — American Government
→ Lessons
→ Unit Exam
→ Pass
→ Unit 2 unlocked

Unit 2 — American History
→ Lessons
→ Unit Exam
→ Pass
→ Unit 3 unlocked

Locked units should clearly communicate why they are locked.

## Lessons

Each unit contains multiple lessons.

A lesson can include:

- Civics questions
- Answers
- Explanations
- Audio
- Practice interactions
- Progress tracking
- Review opportunities

Lessons should feel interactive and educational rather than like a static question database.

## Unit Exams

Each unit has an exam.

The exam evaluates whether the user has mastered the unit.

Passing the exam unlocks the next unit.

The required passing score should come from the product/business rules rather than being hard-coded in multiple places.

Failed exams should allow the user to review weak areas and try again.

## Progress

Track meaningful learning progress:

- Unit progress
- Lesson progress
- Questions mastered
- Accuracy
- Exam scores
- Streak
- XP
- Weak areas
- Overall progress

Progress should be visually clear and motivating.

## Main Navigation

Preferred primary navigation:

- Home
- Learn
- Practice
- Interview
- Profile

Learn is the primary product experience.

## Home

Home should provide:

- Greeting
- Current learning position
- Continue Learning
- Daily goal
- Streak
- XP
- Progress summary

The user should immediately understand what to do next.

## Learn

Learn is the roadmap.

It should visually communicate:

- Current unit
- Completed lessons
- Current lesson
- Locked lessons
- Unit progress
- Next milestone
- Unit exam

The experience should be inspired by the clarity and progression mechanics of modern learning applications, without copying another product's design.

## Practice

Practice should support:

- Random practice
- Weak-area practice
- Timed tests
- Exam-style practice
- Review

## Voice Interview

Voice Interview should use native iOS capabilities.

Prefer native:

- AVFoundation
- Speech framework
- microphone permission APIs

Do not depend on browser microphone APIs for the primary native experience.

Microphone permissions must be handled correctly and gracefully.

## Design

Passcit 2.0 requires a substantial UI/UX redesign.

Do not simply reproduce the current website UI in SwiftUI.

The app should feel:

- Native
- Premium
- Clean
- Fast
- Educational
- Motivating
- Consistent

Prioritize:

- Excellent spacing
- Typography
- Cards
- Progress indicators
- Native navigation
- Smooth animations
- Haptics where appropriate
- Dark mode
- Dynamic Type
- VoiceOver
- Accessibility
- Safe areas
- iPhone responsiveness

Avoid visual clutter.

## Performance

Performance is a primary requirement.

Prioritize:

- Smooth scrolling
- Efficient rendering
- Lazy loading
- Minimal unnecessary network requests
- Caching where appropriate
- Efficient image loading
- Low memory usage
- Fast app launch
- Responsive navigation

Do not optimize prematurely, but do not introduce architecture that makes performance unnecessarily difficult.

## Architecture

Use a clean, maintainable architecture.

Separate:

- UI
- Domain/business logic
- Networking
- Authentication
- Persistence
- Models

Use Swift Concurrency correctly.

Avoid massive View files.

Avoid duplicated business logic.

Prefer reusable components.

## API

The iOS app communicates with the existing Passcit backend through HTTPS APIs.

Create a clean API client layer.

Handle:

- Authentication
- Loading states
- Errors
- Retry behavior
- Token refresh
- Network failures
- Offline states

Do not put networking logic directly inside SwiftUI views.

## Development Rules

Before implementing a major feature:

1. Understand the existing backend behavior.
2. Identify the required API.
3. Define the data model.
4. Define the UI flow.
5. Implement the feature.
6. Test it on the iOS Simulator.
7. Test it on a physical iPhone when appropriate.

Do not make large architectural changes without explaining why.

Do not delete existing functionality without confirming that it is intentionally replaced.

## Claude Code Behavior

Before writing substantial code:

1. Inspect the existing repository.
2. Inspect the existing backend and Prisma schema.
3. Inspect existing authentication behavior.
4. Inspect existing question/progress models.
5. Understand the current API surface.
6. Produce an implementation plan.

Do not immediately start rewriting files.

When implementing a feature, work in small verifiable stages.

After each major stage:

- Build
- Run tests
- Check compiler errors
- Run the app in Simulator
- Verify the relevant user flow

Never assume a UI works without running it.

## Important Product Principle

Passcit should feel like:

"Open the app → know exactly what to do → learn → progress → pass → unlock the next level."

It should NOT feel like:

"Open a website → log in → search for questions → figure out what to study."

The learning roadmap is the heart of Passcit 2.0.
