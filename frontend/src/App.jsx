import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import {
  ExecuteSQL,
  DragDropSQLite,
  ExportToJSON,
  ExportToCSV,
  ExportToXML
} from "../wailsjs/go/main/App";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import DataTable from "react-data-table-component";

const App = () => {
  const [query, setQuery] = useState(
    "SELECT name FROM sqlite_master WHERE type='table';"
  );
  const [results, setResults] = useState([]);
  const [columns, setColumns] = useState([]);
  const [fileMsg, setFileMsg] = useState("");
  const [dataCache, setDataCache] = useState([]);

  const runQuery = async (q = query) => {
    try {
      const data = await ExecuteSQL(q);
      const [headers, ...rows] = data;
      if (!headers || headers.length === 0) return;
      setColumns(
        headers.map((h) => ({
          name: h,
          selector: (row) => row[h],
          sortable: true
        }))
      );
      const mapped = rows.map((r) =>
        Object.fromEntries(headers.map((h, i) => [h, r[i]]))
      );
      setResults(mapped);
      setDataCache([headers, ...rows]);
    } catch (e) {
      alert("SQL Error: " + e);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const result = await DragDropSQLite(file.path);
      setFileMsg(result);
      const previewTables = await ExecuteSQL(
        "SELECT name FROM sqlite_master WHERE type='table';"
      );
      if (previewTables.length > 1) {
        const tableNames = previewTables.slice(1).map((r) => r[0]);
        const firstTable = tableNames[0];
        const previewQuery = `SELECT * FROM "${firstTable}" LIMIT 100;`;
        setQuery(previewQuery);
        runQuery(previewQuery);
      }
    }
  };

  const exportData = async (format) => {
    const path = window.prompt("Enter path with filename to export:");
    if (!path) return;
    try {
      if (format === "json") await ExportToJSON(path, dataCache);
      else if (format === "csv") await ExportToCSV(path, dataCache);
      else if (format === "xml") await ExportToXML(path, dataCache);
      alert("Export successful");
    } catch (err) {
      alert("Export failed: " + err);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        backgroundColor: "#1e1e1e",
        color: "#fff",
        fontFamily: "sans-serif"
      }}
    >
      <div
        style={{
          width: "240px",
          borderRight: "1px solid #444",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <h2
          style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#00dbc2" }}
        >
          DB Mitra
        </h2>
        <label style={{ marginBottom: 8 }}>Open SQLite DB</label>
        <input
          type="file"
          onChange={handleFileChange}
          style={{ marginBottom: "1rem" }}
        />
        <p style={{ fontSize: 12, marginBottom: 12 }}>{fileMsg}</p>
        <button
          onClick={() => runQuery()}
          style={{ padding: 8, marginBottom: 10 }}
        >
          Run Query
        </button>
        <hr style={{ borderColor: "#555", margin: "1rem 0" }} />
        <div style={{ fontSize: 14 }}>
          <strong>Export:</strong>
          <br />
          <button onClick={() => exportData("json")} style={{ marginTop: 6 }}>
            JSON
          </button>
          <br />
          <button onClick={() => exportData("csv")} style={{ marginTop: 6 }}>
            CSV
          </button>
          <br />
          <button onClick={() => exportData("xml")} style={{ marginTop: 6 }}>
            XML
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Tabs>
          <TabList>
            <Tab>SQL Editor</Tab>
            <Tab>Data Grid</Tab>
            <Tab>Form View</Tab>
            <Tab>JSON Editor</Tab>
          </TabList>

          <TabPanel>
            <Editor
              height="calc(100vh - 100px)"
              theme="vs-dark"
              defaultLanguage="sql"
              value={query}
              onChange={(val) => setQuery(val)}
              options={{ fontSize: 14, minimap: { enabled: false } }}
            />
          </TabPanel>

          <TabPanel>
            <div style={{ padding: 10 }}>
              <DataTable
                title="Query Results"
                columns={columns}
                data={results}
                pagination
                dense
                striped
                highlightOnHover
                responsive
                fixedHeader
                fixedHeaderScrollHeight="60vh"
              />
            </div>
          </TabPanel>

          <TabPanel>
            <div style={{ padding: 10 }}>
              {results.length > 0 && (
                <div>
                  {columns.map((col, idx) => (
                    <div key={idx} style={{ marginBottom: 10 }}>
                      <label>{col.name}</label>
                      <input
                        type="text"
                        value={results[0][col.name]}
                        readOnly
                        style={{
                          width: "100%",
                          padding: 6,
                          background: "#333",
                          color: "#fff",
                          border: "1px solid #555"
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabPanel>

          <TabPanel>
            <div style={{ padding: 10 }}>
              <textarea
                readOnly
                value={JSON.stringify(results, null, 2)}
                style={{
                  width: "100%",
                  height: "70vh",
                  background: "#222",
                  color: "#0f0",
                  padding: 10
                }}
              />
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
};

export default App;
