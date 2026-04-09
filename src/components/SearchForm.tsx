interface SearchFormProps {
  action?: string;
  defaultValue?: string;
  disabled?: boolean;
}

export function SearchForm({
  action = "/search",
  defaultValue = "",
  disabled = false,
}: SearchFormProps) {
  return (
    <form action={action} className="search-form">
      <label className="sr-only" htmlFor="search-query">
        Search YouTube
      </label>
      <input
        id="search-query"
        name="q"
        type="search"
        defaultValue={defaultValue}
        disabled={disabled}
        placeholder={
          disabled ? "Typing search is turned off by parent" : "Search YouTube"
        }
        autoComplete="off"
      />
      <button disabled={disabled} type="submit">
        Search
      </button>
    </form>
  );
}
