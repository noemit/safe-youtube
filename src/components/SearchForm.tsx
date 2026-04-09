interface SearchFormProps {
  action?: string;
  defaultValue?: string;
}

export function SearchForm({
  action = "/search",
  defaultValue = "",
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
        placeholder="Search YouTube"
        autoComplete="off"
      />
      <button type="submit">Search</button>
    </form>
  );
}

