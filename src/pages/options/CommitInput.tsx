/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
  @license
**/

import { useEffect, useState } from 'react';

type CommitInputProps = {
  value: string;
  /** Called like the DOM change event: on leaving the field or Enter, if the text changed. */
  onCommit: (value: string) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
};

/** A text field that shows `value` until edited and reports the edit when it is committed. */
export const CommitInput = ({ value, onCommit, ...props }: CommitInputProps) => {
  const [draft, setDraft] = useState(value);
  const [committed, setCommitted] = useState(value);
  useEffect(() => {
    setDraft(value);
    setCommitted(value);
  }, [value]);
  const commit = () => {
    if (draft == committed) return;
    setCommitted(draft);
    onCommit(draft);
  };
  return (
    <input
      type="text"
      {...props}
      value={draft}
      onChange={(ev) => setDraft(ev.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(ev) => {
        if (ev.key == 'Enter') commit();
      }}
    />
  );
};
