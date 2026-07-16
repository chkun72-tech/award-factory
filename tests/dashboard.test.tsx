import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../src/App";

describe("core dashboard smoke test", () => {
  it("renders Award Factory dashboard metrics", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "總覽 Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("全部機會")).toBeInTheDocument();
    expect(screen.getByText("優先推薦行動")).toBeInTheDocument();
  });

  it("renders the expanded opportunity detail workflow", async () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: "機會詳情" })[0]);
    expect(screen.getByText("官方來源 URL")).toBeInTheDocument();
    expect(screen.getByText("下一個關鍵截止 UTC")).toBeInTheDocument();
    expect(screen.getByText("最終截止 UTC")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("Australia/Sydney 顯示時間"))).toBeInTheDocument();
    expect(screen.getByText("查證備註")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "無效 (Invalid)" })).toBeInTheDocument();
  });
});
