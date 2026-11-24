import { Router } from 'express';

import { pool } from '../db';

import {
  authenticate,
  allow,
} from '../middleware/auth';

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const r = Router();

r.use(authenticate, allow('ADMIN'));

r.get('/visitors.xlsx', async (req, res, next) => {
  try {
    const q = await pool.query(
      `
        SELECT
          v.full_name,
          v.phone,
          v.purpose,
          h.house_number,
          u.full_name resident,
          v.status,
          v.expected_at,
          v.entry_at,
          v.exit_at,
          eg.full_name entry_guard,
          xg.full_name exit_guard
        FROM visitors v
        JOIN houses h
          ON h.id = v.house_id
        JOIN users u
          ON u.id = v.resident_id
        LEFT JOIN users eg
          ON eg.id = v.entry_guard_id
        LEFT JOIN users xg
          ON xg.id = v.exit_guard_id
        WHERE v.estate_id = $1
        ORDER BY v.created_at DESC
      `,
      [req.auth!.estateId],
    );

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Visitor Register');

    ws.columns = [
      {
        header: 'Visitor',
        key: 'full_name',
        width: 25,
      },
      {
        header: 'Phone',
        key: 'phone',
        width: 18,
      },
      {
        header: 'Purpose',
        key: 'purpose',
        width: 24,
      },
      {
        header: 'House',
        key: 'house_number',
        width: 12,
      },
      {
        header: 'Resident',
        key: 'resident',
        width: 24,
      },
      {
        header: 'Status',
        key: 'status',
        width: 20,
      },
      {
        header: 'Expected',
        key: 'expected_at',
        width: 24,
      },
      {
        header: 'Entry',
        key: 'entry_at',
        width: 24,
      },
      {
        header: 'Exit',
        key: 'exit_at',
        width: 24,
      },
      {
        header: 'Entry Officer',
        key: 'entry_guard',
        width: 22,
      },
      {
        header: 'Exit Officer',
        key: 'exit_guard',
        width: 22,
      },
    ];

    q.rows.forEach((x) => ws.addRow(x));

    ws.getRow(1).font = {
      bold: true,
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="estate-visitors.xlsx"',
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    next(e);
  }
});

r.get('/visitors.pdf', async (req, res, next) => {
  try {
    const q = await pool.query(
      `
        SELECT
          v.full_name,
          v.phone,
          v.purpose,
          h.house_number,
          u.full_name resident,
          v.status,
          v.entry_at,
          v.exit_at
        FROM visitors v
        JOIN houses h
          ON h.id = v.house_id
        JOIN users u
          ON u.id = v.resident_id
        WHERE v.estate_id = $1
        ORDER BY v.created_at DESC
        LIMIT 2000
      `,
      [req.auth!.estateId],
    );

    res.setHeader('Content-Type', 'application/pdf');

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="estate-visitors.pdf"',
    );

    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
    });

    doc.pipe(res);

    doc.fontSize(18).text('Estate Visitor Register');
    doc.moveDown();
    doc.fontSize(8);

    for (const x of q.rows) {
      doc.text(
        `${x.full_name} | ${x.phone} | House ${x.house_number} | Host: ${x.resident} | ${x.status} | Entry: ${x.entry_at || '-'} | Exit: ${x.exit_at || '-'}`,
      );

      doc.moveDown(0.4);

      if (doc.y > 750) {
        doc.addPage();
      }
    }

    doc.end();
  } catch (e) {
    next(e);
  }
});

r.get('/audit', async (req, res, next) => {
  try {
    const q = await pool.query(
      `
        SELECT
          a.action,
          a.metadata,
          a.created_at,
          u.full_name actor,
          v.full_name visitor
        FROM audit_events a
        LEFT JOIN users u
          ON u.id = a.actor_user_id
        LEFT JOIN visitors v
          ON v.id = a.visitor_id
        WHERE a.estate_id = $1
        ORDER BY a.created_at DESC
        LIMIT 1000
      `,
      [req.auth!.estateId],
    );

    res.json(q.rows);
  } catch (e) {
    next(e);
  }
});

export default r;