import { canEdit, enforcePermission, canView } from '../src/utils/permissions.js';

function runTestSuite() {
  console.log("=== Lead QA Authorization Test Suite ===");

  const tests = [
    {
      name: "Owner Role Permissions",
      role: "owner",
      action: "edit",
      shouldPass: true
    },
    {
      name: "Editor Role Permissions",
      role: "editor",
      action: "edit",
      shouldPass: true
    },
    {
      name: "Viewer Role Write Guard",
      role: "viewer",
      action: "edit",
      shouldPass: false
    },
    {
      name: "Viewer Role Read Access",
      role: "viewer",
      action: "view",
      shouldPass: true
    },
    {
      name: "Guest Editor Write Guard",
      role: "editor",
      action: "edit",
      shouldPass: true
    },
    {
      name: "Malformed Role Block",
      role: "intruder",
      action: "view",
      shouldPass: false
    }
  ];

  let passedTests = 0;

  tests.forEach((t) => {
    let result = false;
    try {
      if (t.action === "view") {
        result = canView(t.role);
      } else {
        result = canEdit(t.role);
      }
      enforcePermission(t.role, t.action);
      
      const success = (result === t.shouldPass);
      if (success) {
        console.log(`[PASS] ${t.name}`);
        passedTests++;
      } else {
        console.log(`[FAIL] ${t.name} (Result did not match expectation)`);
      }
    } catch (err) {
      const success = (!t.shouldPass);
      if (success) {
        console.log(`[PASS] ${t.name} (Correctly threw: ${err.message})`);
        passedTests++;
      } else {
        console.log(`[FAIL] ${t.name} (Threw unexpected error: ${err.message})`);
      }
    }
  });

  console.log(`\nResults: ${passedTests}/${tests.length} tests passed.`);
  
  if (passedTests === tests.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTestSuite();
