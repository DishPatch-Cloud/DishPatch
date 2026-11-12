import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getTables } from "../../https";
import { setCustomer } from "../../redux/slices/customerSlice";
import type { AppDispatch, RootState } from "../../redux/store";

interface Table {
  uuid: string;
  tableNo: string;
  seats: number;
  status: string;
}

interface TablesResponse {
  data?: Table[];
}

const TableInfo = () => {
  const [tables, setTables] = useState<Table[]>([]);

  const dispatch = useDispatch<AppDispatch>();

  const customerData = useSelector(
    (state: RootState) => state.customer
  );

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await getTables();

        const responseData = response.data as TablesResponse;
        const tableData = responseData.data ?? [];

        const sortedTables = [...tableData].sort((a, b) => {
          const aMatch = a.tableNo.match(/^([A-Z]+)(\d+)$/);
          const bMatch = b.tableNo.match(/^([A-Z]+)(\d+)$/);

          if (!aMatch || !bMatch) {
            return a.tableNo.localeCompare(b.tableNo);
          }

          const [, aLetter, aNumber] = aMatch;
          const [, bLetter, bNumber] = bMatch;

          if (aLetter !== bLetter) {
            return aLetter.localeCompare(bLetter);
          }

          return Number(aNumber) - Number(bNumber);
        });

        setTables(sortedTables);
      } catch (error) {
        console.error("Failed to fetch tables:", error);
      }
    };

    void fetchTables();
  }, []);

  const handleSelectTable = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const tableUuid = event.target.value;

    const selectedTable = tables.find(
      (table) => table.uuid === tableUuid
    );

    if (!selectedTable) return;

    dispatch(
      setCustomer({
        ...customerData,
        table: {
          uuid: selectedTable.uuid,
          tableNo: selectedTable.tableNo,
          seats: selectedTable.seats,
          status: selectedTable.status,
        },
      })
    );
  };

  return (
    <label className="flex items-center justify-between gap-3">
      <span className="font-display text-2xl font-semibold text-[#4a2c17]">
        Table
      </span>
      <select
        value={customerData.table?.uuid ?? ""}
        onChange={handleSelectTable}
        className="cursor-pointer rounded-full border border-[#eadccb] bg-white/80 px-4 py-2 text-sm font-semibold text-[#4a2c17] outline-none transition focus:border-[#e9b949] focus:ring-4 focus:ring-[#e9b949]/30"
      >
        <option value="" disabled>
          Choose
        </option>
        {tables.map((table) => (
          <option key={table.uuid} value={table.uuid}>
            {table.tableNo}
          </option>
        ))}
      </select>
    </label>
  );
};

export default TableInfo;