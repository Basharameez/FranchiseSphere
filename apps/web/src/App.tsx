import { useState } from "react";
import { 
  FolderGit, 
  Layers, 
  Ruler, 
  DollarSign, 
  CheckSquare, 
  Activity, 
  MessageSquare,
  Sparkles,
  TrendingUp
} from "lucide-react";

type View = "dashboard" | "styles" | "bom" | "measurements" | "costing" | "audit";

interface StyleItem {
  id: string;
  styleNumber: string;
  name: string;
  category: string;
  status: string;
  margin: number;
}

export default function App() {
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [selectedStyle, setSelectedStyle] = useState<StyleItem | null>(null);

  // High fidelity mock styles database
  const styles: StyleItem[] = [
    { id: "1", styleNumber: "ST-CLS-D101", name: "Velvet Midi Slip Dress", category: "Dresses", status: "Approved", margin: 0.62 },
    { id: "2", styleNumber: "ST-CLS-D102", name: "Classic French Linen Dress", category: "Dresses", status: "Development", margin: 0.58 },
    { id: "3", styleNumber: "ST-SPT-T201", name: "Active Dry Running Tee", category: "Tops", status: "Approved", margin: 0.65 },
    { id: "4", styleNumber: "ST-SPT-T202", name: "Thermal Tech Zip Hoodie", category: "Outerwear", status: "Reviewing", margin: 0.60 },
  ];

  const menuItems = [
    { view: "dashboard", label: "Dashboard Analytics", icon: Activity },
    { view: "styles", label: "Styles Directory", icon: FolderGit },
    { view: "bom", label: "Bills of Materials", icon: Layers },
    { view: "measurements", label: "Sizing & Grading Rules", icon: Ruler },
    { view: "costing", label: "Estimates & Quotes", icon: DollarSign },
    { view: "audit", label: "Compliance & Audits", icon: CheckSquare },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#090b11" }}>
      {/* Sidebar Navigation */}
      <aside style={{
        width: "280px",
        background: "#0c0f17",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "2rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "2rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Sparkles style={{ color: "#a855f7" }} />
          <h2 style={{ fontSize: "1.25rem", color: "#fff", fontFamily: "'Outfit', sans-serif" }}>Threadline PLM</h2>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const active = currentView === item.view;
            return (
              <button 
                key={item.view}
                onClick={() => {
                  setCurrentView(item.view as View);
                  if (item.view !== "styles") setSelectedStyle(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: active ? "rgba(168, 85, 247, 0.15)" : "transparent",
                  border: "none",
                  borderRadius: "8px",
                  color: active ? "#c084fc" : "#94a3b8",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.95rem",
                  textAlign: "left",
                  transition: "all 0.2s"
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Workspace */}
      <main style={{ flex: 1, padding: "3rem", overflowY: "auto" }}>
        {currentView === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            <div>
              <h1 style={{ fontSize: "2rem", color: "#fff", marginBottom: "0.5rem" }}>PLM Workspace Overview</h1>
              <p style={{ color: "#94a3b8" }}>Real-time production and design metrics for the current season.</p>
            </div>

            {/* Metrics cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
              <div className="glass-panel">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Styles in Design</span>
                  <FolderGit style={{ color: "#a855f7" }} />
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "700" }}>42</div>
                <div style={{ fontSize: "0.8rem", color: "#10b981", marginTop: "0.5rem" }}>+12% vs last season</div>
              </div>

              <div className="glass-panel">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Average Target Margin</span>
                  <TrendingUp style={{ color: "#10b981" }} />
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "700" }}>61.2%</div>
                <div style={{ fontSize: "0.8rem", color: "#10b981", marginTop: "0.5rem" }}>Above target threshold (60%)</div>
              </div>

              <div className="glass-panel">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Pending Fits Evaluations</span>
                  <Activity style={{ color: "#f59e0b" }} />
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "700" }}>8 Rounds</div>
                <div style={{ fontSize: "0.8rem", color: "#f59e0b", marginTop: "0.5rem" }}>4 proto rounds waiting review</div>
              </div>
            </div>

            {/* Active comments activities stream */}
            <div className="glass-panel">
              <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "#fff" }}>Real-time Design Action Log</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ paddingBottom: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "1rem" }}>
                  <MessageSquare size={16} style={{ color: "#a855f7", marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "0.9rem", color: "#fff" }}>Designer posted fit feedback on <strong>Velvet Midi Slip Dress</strong></div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>2 hours ago by designer1@designco.com</div>
                  </div>
                </div>
                <div style={{ paddingBottom: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "1rem" }}>
                  <Layers size={16} style={{ color: "#10b981", marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "0.9rem", color: "#fff" }}>Material spec <strong>100% Belgian Linen</strong> was approved for production</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>4 hours ago by director@designco.com</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === "styles" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <div>
              <h1 style={{ fontSize: "2rem", color: "#fff", marginBottom: "0.5rem" }}>Styles Catalog</h1>
              <p style={{ color: "#94a3b8" }}>Manage active garments, briefs specs, and colorways.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              {/* Style List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {styles.map(style => (
                  <div 
                    key={style.id} 
                    className="glass-panel"
                    onClick={() => setSelectedStyle(style)}
                    style={{
                      cursor: "pointer",
                      borderLeft: selectedStyle?.id === style.id ? "4px solid #a855f7" : "1px solid rgba(255, 255, 255, 0.08)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ fontSize: "1.1rem", color: "#fff" }}>{style.name}</h4>
                        <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>Style #: {style.styleNumber} | Cat: {style.category}</div>
                      </div>
                      <span style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        background: style.status === "Approved" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        color: style.status === "Approved" ? "#34d399" : "#fbbf24"
                      }}>{style.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Style Detail Brief Pane */}
              <div className="glass-panel" style={{ minHeight: "300px" }}>
                {selectedStyle ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div>
                      <h3 style={{ fontSize: "1.3rem", color: "#fff" }}>{selectedStyle.name}</h3>
                      <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Active Development Specs</div>
                    </div>
                    <div>
                      <strong>Design Objective:</strong>
                      <p style={{ color: "#94a3b8", marginTop: "0.25rem", fontSize: "0.9rem" }}>Create a high-quality minimal drape layout suitable for transitional summer wear.</p>
                    </div>
                    <div>
                      <strong>Key Materials Mapped:</strong>
                      <ul style={{ color: "#94a3b8", paddingLeft: "1.2rem", marginTop: "0.5rem", fontSize: "0.9rem" }}>
                        <li>100% Belgian Linen (Shell Fabric)</li>
                        <li>YKK Brass Zip 15cm (Fastening)</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b" }}>
                    <FolderGit size={48} style={{ marginBottom: "1rem" }} />
                    <p>Select a style to view details and specifications brief.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentView === "bom" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <div>
              <h1 style={{ fontSize: "2rem", color: "#fff", marginBottom: "0.5rem" }}>Bills of Materials (BOM)</h1>
              <p style={{ color: "#94a3b8" }}>Component-level detail mapping for fabric and trim items.</p>
            </div>

            <div className="glass-panel">
              <table style={{ width: "100%", borderCollapse: "collapse", color: "#94a3b8", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "left" }}>
                    <th style={{ padding: "1rem", color: "#fff" }}>Position</th>
                    <th style={{ padding: "1rem", color: "#fff" }}>Material Code</th>
                    <th style={{ padding: "1rem", color: "#fff" }}>Description</th>
                    <th style={{ padding: "1rem", color: "#fff" }}>Usage Qty</th>
                    <th style={{ padding: "1rem", color: "#fff" }}>Est Unit Cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "1rem" }}>Shell Body</td>
                    <td style={{ padding: "1rem", color: "#a855f7" }}>MAT-LIN-100</td>
                    <td style={{ padding: "1rem" }}>100% Belgian Linen Fabric</td>
                    <td style={{ padding: "1rem" }}>1.8 m</td>
                    <td style={{ padding: "1rem" }}>$15.50 / m</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "1rem" }}>Center Back Close</td>
                    <td style={{ padding: "1rem", color: "#a855f7" }}>MAT-ZIP-M5</td>
                    <td style={{ padding: "1rem" }}>YKK Brass Zipper 15cm</td>
                    <td style={{ padding: "1rem" }}>1.0 pcs</td>
                    <td style={{ padding: "1rem" }}>$2.20 / pcs</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {currentView === "measurements" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <div>
              <h1 style={{ fontSize: "2rem", color: "#fff", marginBottom: "0.5rem" }}>Sizing & Grading Chart</h1>
              <p style={{ color: "#94a3b8" }}>Graded values trace computed using technical rules.</p>
            </div>

            <div className="glass-panel">
              <h3 style={{ marginBottom: "1rem", color: "#fff" }}>Base Size: M (Alpha Sizing)</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", color: "#94a3b8", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "left" }}>
                    <th style={{ padding: "1rem", color: "#fff" }}>Point Code</th>
                    <th style={{ padding: "1rem", color: "#fff" }}>XS</th>
                    <th style={{ padding: "1rem", color: "#fff" }}>S</th>
                    <th style={{ padding: "1rem", color: "#fff" }}>M (Base)</th>
                    <th style={{ padding: "1rem", color: "#fff" }}>L</th>
                    <th style={{ padding: "1rem", color: "#fff" }}>XL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "1rem", color: "#fff" }}>CHEST-WIDTH</td>
                    <td style={{ padding: "1rem" }}>44.0 cm</td>
                    <td style={{ padding: "1rem" }}>46.5 cm</td>
                    <td style={{ padding: "1rem", color: "#a855f7" }}>49.0 cm</td>
                    <td style={{ padding: "1rem" }}>51.5 cm</td>
                    <td style={{ padding: "1rem" }}>54.0 cm</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "1rem", color: "#fff" }}>BODY-LENGTH</td>
                    <td style={{ padding: "1rem" }}>68.5 cm</td>
                    <td style={{ padding: "1rem" }}>69.5 cm</td>
                    <td style={{ padding: "1rem", color: "#a855f7" }}>71.0 cm</td>
                    <td style={{ padding: "1rem" }}>72.5 cm</td>
                    <td style={{ padding: "1rem" }}>74.0 cm</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {currentView === "costing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <div>
              <h1 style={{ fontSize: "2rem", color: "#fff", marginBottom: "0.5rem" }}>Cost Estimates & Margin Rules</h1>
              <p style={{ color: "#94a3b8" }}>Wholesale margins and retail markup factor calculation estimators.</p>
            </div>

            <div className="glass-panel">
              <h3 style={{ marginBottom: "1rem", color: "#fff" }}>Margin Threshold Check</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "0.5rem" }}>
                  <span>Total Materials & Trim Cost:</span>
                  <span style={{ color: "#fff" }}>$32.30</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "0.5rem" }}>
                  <span>CMT Labor & Assembly:</span>
                  <span style={{ color: "#fff" }}>$15.00</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "0.5rem" }}>
                  <span>Wholesale Target Margin:</span>
                  <span style={{ color: "#a855f7" }}>60.0%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "0.5rem" }}>
                  <span>Required Wholesale Price:</span>
                  <span style={{ color: "#fff", fontWeight: "700" }}>$130.00</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.5rem" }}>
                  <span>Calculated Suggested Retail (2.2 Markup Factor):</span>
                  <span style={{ color: "#10b981", fontWeight: "700" }}>$286.00</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === "audit" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <div>
              <h1 style={{ fontSize: "2rem", color: "#fff", marginBottom: "0.5rem" }}>Compliance Change Audit logs</h1>
              <p style={{ color: "#94a3b8" }}>Immutable record trail logs of modifications to styles, BOM, and files.</p>
            </div>

            <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <span style={{ color: "#e11d48", marginRight: "1rem" }}>[CREATE]</span>
                  <span style={{ color: "#fff" }}>Style record <strong>ST-CLS-D101</strong> added to catalog</span>
                </div>
                <span style={{ color: "#64748b" }}>2026-07-25 14:02:21</span>
              </div>
              <div style={{ padding: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <span style={{ color: "#f59e0b", marginRight: "1rem" }}>[UPDATE]</span>
                  <span style={{ color: "#fff" }}>BOM item quantity changed from <strong>1.5</strong> to <strong>1.8</strong></span>
                </div>
                <span style={{ color: "#64748b" }}>2026-07-25 14:02:21</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
