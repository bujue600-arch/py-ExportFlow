import { render, screen } from "@testing-library/react";
import AssetListPage from "../AssetListPage";

describe("AssetListPage 骨架", () => {
  it("渲染页面标题", () => {
    render(<AssetListPage />);
    expect(screen.getByRole("heading", { name: "作品库" })).toBeInTheDocument();
  });
});
