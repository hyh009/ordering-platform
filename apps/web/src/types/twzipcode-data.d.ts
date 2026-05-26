declare module 'twzipcode-data/dist/en/counties' {
  const counties: Array<{
    id: string;
    name: string;
  }>;

  export default counties;
}

declare module 'twzipcode-data/dist/en/zipcodes' {
  const zipcodes: Array<{
    city: string;
    county: string;
    id: string;
    zipcode: number;
  }>;

  export default zipcodes;
}

declare module 'twzipcode-data/dist/zh-tw/counties' {
  const counties: Array<{
    id: string;
    name: string;
  }>;

  export default counties;
}

declare module 'twzipcode-data/dist/zh-tw/zipcodes' {
  const zipcodes: Array<{
    city: string;
    county: string;
    id: string;
    zipcode: number;
  }>;

  export default zipcodes;
}
