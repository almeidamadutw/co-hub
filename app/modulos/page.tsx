"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

import {
  AulaModulo,
  useModulosSupabase,
} from "@/utils/useModulosSupabase";

import {
  getUsuarioLogado,
  usuarioTemPermissao,
  User,
} from "@/utils/auth";