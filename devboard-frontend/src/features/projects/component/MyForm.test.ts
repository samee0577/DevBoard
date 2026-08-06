import { describe, it, expect } from 'vitest';
import { validateProject } from './MyForm';
import type { NewProjectDraft } from './MyForm';

describe('MyForm Component unit testing', () => {
    it("returns true when a name is empty", () => {
        const Draft: NewProjectDraft = {
            name: "",
            domain: "example.com",
            summary: "This is a valid project.",
            techStack: ["React", "TypeScript"],
            features: [
                { title: "Feature 1", tasks: ["Task 1", "Task 2"] },
            ]
        };
        expect(validateProject(Draft)).toBe(false);
    })

    it("returns true when all field validations pass", () => {
        const Draft: NewProjectDraft = {
            name: "hello world",
            domain: "example.com",
            summary: "This is a valid project.",
            techStack: ["React", "TypeScript"],
            features: [
                { title: "Feature 1", tasks: ["Task 1", "Task 2"] },
            ]
        };
        expect(validateProject(Draft)).toBe(true);
    })

    it("returnns false if tech stack is all blank", () => {
        const Draft: NewProjectDraft = {
            name: "hello world",
            domain: "example.com",
            summary: "This is a valid project.",
            techStack: ["",""],
            features: [
                { title: "Feature 1", tasks: ["Task 1", "Task 2"] },
            ]
        };
        expect(validateProject(Draft)).toBe(false);
    })

    it("returnns false if features array is empty", () => {
        const Draft: NewProjectDraft = {
            name: "hello world",
            domain: "example.com",
            summary: "This is a valid project.",
            techStack: ["React", "TypeScript"],
            features: [
                
            ]
        };
        expect(validateProject(Draft)).toBe(false);
    })

    it("returnns false if features title is blank", () => {
        const Draft: NewProjectDraft = {
            name: "hello world",
            domain: "example.com",
            summary: "This is a valid project.",
            techStack: ["React", "TypeScript"],
            features: [
                { title: "", tasks: ["Task 1", "Task 2"] },
            ]
        };
        expect(validateProject(Draft)).toBe(false);
    })

    it("returnns true if features any task is blank", () => {
        const Draft: NewProjectDraft = {
            name: "hello world",
            domain: "example.com",
            summary: "This is a valid project.",
            techStack: ["React", "TypeScript"],
            features: [
                { title: "Feature 1", tasks: ["", "Task 2"] },
            ]
        };
        expect(validateProject(Draft)).toBe(true);
    })

        it("returnns false if features all task is blank", () => {
        const Draft: NewProjectDraft = {
            name: "hello world",
            domain: "example.com",
            summary: "This is a valid project.",
            techStack: ["React", "TypeScript"],
            features: [
                { title: "Feature 1", tasks: ["", ""] },
            ]
        };
        expect(validateProject(Draft)).toBe(false);
    })
})