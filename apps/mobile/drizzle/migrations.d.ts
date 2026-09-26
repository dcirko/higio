declare const migrations: {
  journal: {
    entries: {
      breakpoints: boolean;
      idx: number;
      tag: string;
      when: number;
    }[];
  };
  migrations: Record<string, string>;
};

export default migrations;
