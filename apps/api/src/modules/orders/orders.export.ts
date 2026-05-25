import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { OrdersService } from './orders.service';
import type { ListOrdersDto } from './dto/list-orders.dto';

type OrderForExport = Awaited<ReturnType<OrdersService['listForExport']>>[number];

interface ExportRow {
  number: number;
  createdAt: string; // YYYY-MM-DD HH:MM
  customer: string;
  phone: string;
  status: string;
  paymentStatus: string;
  itemsCount: number;
  subtotal: string;
  discount: string;
  total: string;
  paid: string;
  notes: string;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function fmtDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function toRow(o: OrderForExport): ExportRow {
  return {
    number: o.number,
    createdAt: fmtDate(o.createdAt),
    customer: o.customer?.name ?? '',
    phone: o.customer?.phone ?? '',
    status: o.status,
    paymentStatus: o.paymentStatus,
    itemsCount: o.items.length,
    subtotal: o.subtotal.toString(),
    discount: o.discount.toString(),
    total: o.total.toString(),
    paid: o.paidAmount.toString(),
    notes: (o.notes ?? '').replace(/\r?\n/g, ' '),
  };
}

const COLUMNS: { key: keyof ExportRow; header: string; width: number }[] = [
  { key: 'number', header: 'Number', width: 10 },
  { key: 'createdAt', header: 'Created (UTC)', width: 18 },
  { key: 'customer', header: 'Customer', width: 28 },
  { key: 'phone', header: 'Phone', width: 16 },
  { key: 'status', header: 'Status', width: 12 },
  { key: 'paymentStatus', header: 'Payment', width: 12 },
  { key: 'itemsCount', header: 'Items', width: 8 },
  { key: 'subtotal', header: 'Subtotal', width: 14 },
  { key: 'discount', header: 'Discount', width: 14 },
  { key: 'total', header: 'Total', width: 14 },
  { key: 'paid', header: 'Paid', width: 14 },
  { key: 'notes', header: 'Notes', width: 40 },
];

function csvField(value: unknown): string {
  const s = String(value ?? '');
  if (/[",\r\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

@Injectable()
export class OrdersExportService {
  constructor(private readonly orders: OrdersService) {}

  async exportCsv(storeId: string, query: ListOrdersDto): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.orders.listForExport(storeId, query);
    const rows = data.map(toRow);
    const lines: string[] = [];
    lines.push(COLUMNS.map((c) => csvField(c.header)).join(','));
    for (const row of rows) {
      lines.push(COLUMNS.map((c) => csvField(row[c.key])).join(','));
    }
    // UTF-8 BOM so Excel detects encoding correctly when double-clicking.
    const body = '﻿' + lines.join('\r\n');
    return {
      buffer: Buffer.from(body, 'utf8'),
      filename: `orders-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }

  async exportXlsx(
    storeId: string,
    query: ListOrdersDto,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.orders.listForExport(storeId, query);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SavdoCRM';
    wb.created = new Date();

    const sheet = wb.addWorksheet('Orders');
    sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    for (const o of data) {
      const r = toRow(o);
      sheet.addRow({
        ...r,
        subtotal: Number(r.subtotal),
        discount: Number(r.discount),
        total: Number(r.total),
        paid: Number(r.paid),
      });
    }

    // Items sheet (one row per line item) for deeper analysis.
    const items = wb.addWorksheet('Items');
    items.columns = [
      { header: 'Order #', key: 'number', width: 10 },
      { header: 'Product', key: 'product', width: 32 },
      { header: 'SKU', key: 'sku', width: 16 },
      { header: 'Qty', key: 'qty', width: 8 },
      { header: 'Unit price', key: 'unitPrice', width: 14 },
      { header: 'Line total', key: 'lineTotal', width: 14 },
    ];
    items.getRow(1).font = { bold: true };
    items.views = [{ state: 'frozen', ySplit: 1 }];
    for (const o of data) {
      for (const it of o.items) {
        items.addRow({
          number: o.number,
          product: it.product.name,
          sku: it.product.sku ?? '',
          qty: it.qty,
          unitPrice: Number(it.unitPrice),
          lineTotal: Number(it.lineTotal),
        });
      }
    }

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return {
      buffer,
      filename: `orders-${new Date().toISOString().slice(0, 10)}.xlsx`,
    };
  }
}
