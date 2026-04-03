package seeds

import (
	"context"
	"embed"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

//go:embed *.sql
var embedded embed.FS

func applyOrgID(sql string, orgID uuid.UUID) string {
	return strings.ReplaceAll(sql, "__SEED_ORG_ID__", orgID.String())
}

func RunDemo(ctx context.Context, db *gorm.DB, orgID uuid.UUID) error {
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("scheduling seeds get sql db: %w", err)
	}
	body, err := embedded.ReadFile("0001_demo.sql")
	if err != nil {
		return fmt.Errorf("scheduling seeds read demo: %w", err)
	}
	if _, err := sqlDB.ExecContext(ctx, applyOrgID(string(body), orgID)); err != nil {
		return fmt.Errorf("scheduling seeds exec demo: %w", err)
	}
	return nil
}
