package main

import (
	"context"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

type App struct {
	db *sql.DB
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	fmt.Println("DB Mitra started")
}

func (a *App) DragDropSQLite(path string) (string, error) {
	if !strings.HasSuffix(path, ".db") && !strings.HasSuffix(path, ".sqlite") {
		return "", fmt.Errorf("Not a supported SQLite file")
	}
	absPath, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		return "", fmt.Errorf("File does not exist: %s", absPath)
	}

	db, err := sql.Open("sqlite3", absPath)
	if err != nil {
		return "", fmt.Errorf("Failed to open SQLite DB: %v", err)
	}
	a.db = db
	return fmt.Sprintf("Connected to SQLite DB: %s", absPath), nil
}

func (a *App) ExecuteSQL(query string) ([][]string, error) {
	if a.db == nil {
		return nil, fmt.Errorf("No database connected")
	}
	rows, err := a.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	results := [][]string{cols}
	for rows.Next() {
		values := make([]interface{}, len(cols))
		valuePtrs := make([]interface{}, len(cols))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, err
		}

		row := make([]string, len(cols))
		for i, val := range values {
			if val == nil {
				row[i] = "NULL"
			} else {
				row[i] = fmt.Sprintf("%v", val)
			}
		}
		results = append(results, row)
	}

	return results, nil
}

func (a *App) ExportToJSON(path string, data [][]string) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return json.NewEncoder(f).Encode(data)
}

func (a *App) ExportToCSV(path string, data [][]string) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	writer := csv.NewWriter(f)
	defer writer.Flush()
	for _, record := range data {
		if err := writer.Write(record); err != nil {
			return err
		}
	}
	return nil
}

func (a *App) ExportToXML(path string, data [][]string) error {
	type Row struct {
		Values []string `xml:"value"`
	}
	type Table struct {
		XMLName xml.Name `xml:"table"`
		Rows    []Row    `xml:"row"`
	}
	table := Table{}
	for _, line := range data {
		table.Rows = append(table.Rows, Row{Values: line})
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return xml.NewEncoder(f).Encode(table)
}
