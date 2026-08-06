import { describe, expect, it, vi } from "vitest";
import { ProjectsContext } from '../context/projectContext';
import MyForm from './MyForm';
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("myForm integration testing", () => {

  it('type into the name field', async () => {
    
    const mockDispacth = vi.fn();
    const user = userEvent.setup();
    
    render(
      <ProjectsContext.Provider value={{ state: { projects: [] }, dispatch: mockDispacth }}>
        <MyForm />
      </ProjectsContext.Provider>
    )

    const nameInput = screen.getByPlaceholderText("Name");
    await user.type(nameInput, "hello world");

    const domainInput = screen.getByPlaceholderText("Domain");
    await user.type(domainInput, "example.com");
    
    const summaryInput = screen.getByPlaceholderText("Summary");
    await user.type(summaryInput, "This is summary");

    const techStackInput = screen.getByPlaceholderText("e.g. React");
    await user.type(techStackInput, "React");

    const featureTitleInput = screen.getByPlaceholderText("Feature Title");
    await user.type(featureTitleInput, "feature1");

    const taskInput = screen.getByPlaceholderText("Enter task");
    await user.type(taskInput, "Build form");

    const submitButton = screen.getByRole("button", { name: "Create Project" });
    await user.click(submitButton);
        
    expect(mockDispacth).toHaveBeenCalledWith({
      type: "ADD_PROJECT",
      payload: {
        id: expect.any(String),
        name: "hello world",
        summary: "This is summary",
        domain: "example.com",
        completion: 0,
        techStack: ["React"],
        features: [
          {
            id: expect.any(String),
            title: "feature1",
            status: false,
            tasks: [
              {
                id: expect.any(String),
                title: "Build form",
                status: false
              }
            ]
          }
        ],
      }
    })

  });
});