// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type DataTableColumn } from './DataTable';

type Row = {
  name: string;
  age: number;
};

const rows: Row[] = [
  { name: 'Grace', age: 41 },
  { name: 'Ada', age: 30 },
  { name: 'Linus', age: 21 },
];

const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Name', filterType: 'text' },
  { key: 'age', header: 'Age' },
];

function visibleNames() {
  return screen
    .getAllByRole('row')
    .slice(1, 3)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent);
}

describe('DataTable', () => {
  it('sorts rows and forwards pagination changes', () => {
    const onPageChange = vi.fn();

    render(
      <DataTable
        data={rows}
        columns={columns}
        pagination={{ page: 1, perPage: 2, total: rows.length, onPageChange }}
      />,
    );

    const ageHeader = screen.getByText('Age').closest('th');
    const sortButton = within(ageHeader as HTMLElement).getByRole('button');

    fireEvent.click(sortButton);
    expect(visibleNames()).toEqual(['Linus', 'Ada']);

    fireEvent.click(sortButton);
    expect(visibleNames()).toEqual(['Grace', 'Ada']);

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('applies and clears text filters through the callback contract', () => {
    const onFilterChange = vi.fn();

    render(
      <DataTable
        data={rows}
        columns={columns}
        filters={{}}
        onFilterChange={onFilterChange}
        enableFilters
      />,
    );

    const nameHeader = screen.getByText('Name').closest('th');
    fireEvent.click(within(nameHeader as HTMLElement).getByTitle('Filtrar'));
    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'Ada' } });
    expect(onFilterChange).toHaveBeenCalledWith({ name: 'Ada' });

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(onFilterChange).toHaveBeenLastCalledWith({});
  });
});
