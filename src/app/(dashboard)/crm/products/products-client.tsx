"use client";

import { useLocale } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EntityBadge } from "@/components/crm/shared/EntityBadge";
import { EmptyState } from "@/components/crm/shared/EmptyState";
import { Package } from "lucide-react";

type ProductItem = {
  id: string;
  code: string;
  category: string;
  nameEn: string;
  nameAr: string;
  basePrice: unknown;
  currency: string;
  dealType: string;
  active: boolean;
  entity: {
    id: string;
    code: string;
    nameEn: string;
    nameAr: string;
    color: string;
  };
};

export function ProductsClient({ products }: { products: ProductItem[] }) {
  const { t, locale } = useLocale();

  if (products.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t.nav.products}</h1>
        <EmptyState
          icon={<Package className="h-8 w-8 text-muted-foreground" />}
          title={t.common.noResults}
        />
      </div>
    );
  }

  // Group by entity, then by category
  const grouped = new Map<
    string,
    {
      entity: ProductItem["entity"];
      categories: Map<string, ProductItem[]>;
    }
  >();

  for (const product of products) {
    const entityCode = product.entity.code;
    if (!grouped.has(entityCode)) {
      grouped.set(entityCode, {
        entity: product.entity,
        categories: new Map(),
      });
    }
    const entityGroup = grouped.get(entityCode)!;
    if (!entityGroup.categories.has(product.category)) {
      entityGroup.categories.set(product.category, []);
    }
    entityGroup.categories.get(product.category)!.push(product);
  }

  const dealTypeLabels = t.dealTypes as Record<string, string>;
  const currencyLabels = t.currencies as Record<string, string>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.nav.products}</h1>

      {Array.from(grouped.entries()).map(([entityCode, { entity, categories }]) => (
        <Card key={entityCode}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <EntityBadge
                code={entity.code}
                name={locale === "ar" ? entity.nameAr : entity.nameEn}
                color={entity.color}
              />
              <span>
                {locale === "ar" ? entity.nameAr : entity.nameEn}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.from(categories.entries()).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {category}
                </h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Code</TableHead>
                        <TableHead>{t.common.name}</TableHead>
                        <TableHead>{t.forms.basePrice}</TableHead>
                        <TableHead>{t.forms.currency}</TableHead>
                        <TableHead>{t.forms.dealType}</TableHead>
                        <TableHead>{t.common.status}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-mono text-xs ltr-nums">
                            {product.code}
                          </TableCell>
                          <TableCell className="font-medium">
                            {locale === "ar" ? product.nameAr : product.nameEn}
                          </TableCell>
                          <TableCell className="ltr-nums">
                            {Number(product.basePrice).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>
                            {currencyLabels[product.currency] ?? product.currency}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {dealTypeLabels[product.dealType] ?? product.dealType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {product.active ? (
                              <Badge variant="default" className="bg-emerald-600">
                                {t.common.active}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {t.common.inactive}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
