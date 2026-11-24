# How this project follows the uploaded TechCrush Student Handbook

The handbook's pages 1–3 explain the development setup: Node.js LTS, VS Code, Expo Go, project root, terminal commands, saving files and testing on a phone.

Page 4 introduces Expo Router and a clean folder arrangement with `app/`, route groups, `components/` and `constants/`. This project follows that approach:
- `app/` contains file-based mobile screens and navigation.
- `app/(tabs)/` contains the main role dashboard, activity and profile routes.
- `components/` contains reusable UI building blocks.
- `constants/` contains palette and demo data.
- `context/` shares app state between screens.
- `types/` contains TypeScript data contracts.

Pages 5–8 explain JSX, React Native elements, styles, state, reusable buttons and inputs; these patterns are used in the prototype.

The handbook's later guided-build section explains that mock data is useful for building and testing screens before a real backend exists, and warns that demo logic is not a secure way to handle real services. Accordingly, this ZIP clearly labels local mock behavior and adds `backend/` and `database/` for the real server-side implementation.

This is a guide to file organization and learning sequence, not a reason to copy the handbook's PocketPay wallet files into this project.
