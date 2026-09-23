import { describe, expect, it } from "vitest";
import {
  isValidUsername,
  loginIdentifierToEmail,
  normalizeUsername,
  usernameToEmail,
} from "./user-login";

describe("username login", () => {
  it("normalizes and validates supported usernames", () => {
    expect(normalizeUsername("  Gabriel.Silva  ")).toBe("gabriel.silva");
    expect(isValidUsername("gabriel.silva")).toBe(true);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("gabriel@empresa.com")).toBe(false);
  });

  it("uses a reserved internal email for username accounts", () => {
    expect(usernameToEmail("Gabriel.Silva")).toBe("gabriel.silva@users.taskflow.invalid");
  });

  it("keeps legacy email login compatible", () => {
    expect(loginIdentifierToEmail(" Admin@Empresa.com ")).toBe("admin@empresa.com");
    expect(loginIdentifierToEmail("gabriel")).toBe("gabriel@users.taskflow.invalid");
  });
});
